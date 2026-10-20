<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductCategoryHierarchyTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => User::ROLE_ADMIN]);
    }

    private function category(string $name, ?int $parentId = null): ProductCategory
    {
        return ProductCategory::create([
            'name' => $name,
            'active' => true,
            'parent_id' => $parentId,
        ]);
    }

    private function product(ProductCategory $category, string $name): Product
    {
        return Product::create([
            'name' => $name,
            'category_id' => $category->id,
            'price' => 50.00,
            'available' => true,
            'stock_quantity' => 5,
        ]);
    }

    public function test_non_admin_cannot_manage_categories(): void
    {
        $user = User::factory()->create(); // defaults to the USER role

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/admin/categories', ['name' => 'Nope'])
            ->assertForbidden();
    }

    public function test_parent_can_be_created_and_a_subcategory_assigned_to_it(): void
    {
        $admin = $this->admin();
        $parent = $this->category('SPICES');

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/categories', ['name' => 'Turmeric', 'parent_id' => $parent->id]);

        $response->assertCreated()
            ->assertJsonPath('data.parentId', $parent->id)
            ->assertJsonPath('data.isSubcategory', true);

        $this->assertDatabaseHas('product_categories', [
            'name' => 'Turmeric',
            'parent_id' => $parent->id,
        ]);
    }

    public function test_top_level_category_is_created_with_a_null_parent(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/categories', ['name' => 'READY_TO_EAT'])
            ->assertCreated()
            ->assertJsonPath('data.parentId', null)
            ->assertJsonPath('data.isSubcategory', false);
    }

    public function test_third_level_nesting_is_rejected(): void
    {
        $admin = $this->admin();
        $parent = $this->category('SPICES');
        $sub = $this->category('Turmeric', $parent->id);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/categories', ['name' => 'Organic', 'parent_id' => $sub->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors('parent_id');

        $this->assertDatabaseMissing('product_categories', ['name' => 'Organic']);
    }

    public function test_a_category_cannot_be_its_own_parent(): void
    {
        $admin = $this->admin();
        $parent = $this->category('SPICES');

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/categories/{$parent->id}", [
                'name' => 'SPICES',
                'parent_id' => $parent->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('parent_id');
    }

    public function test_a_parent_with_subcategories_cannot_become_a_subcategory(): void
    {
        $admin = $this->admin();
        $parent = $this->category('SPICES');
        $this->category('Turmeric', $parent->id);
        $other = $this->category('SWEETS');

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/categories/{$parent->id}", [
                'name' => 'SPICES',
                'parent_id' => $other->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('parent_id');
    }

    public function test_an_invalid_parent_id_is_rejected(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/categories', ['name' => 'Turmeric', 'parent_id' => 999999])
            ->assertStatus(422)
            ->assertJsonValidationErrors('parent_id');
    }

    public function test_duplicate_category_names_are_rejected(): void
    {
        $admin = $this->admin();
        $this->category('SPICES');

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/categories', ['name' => 'SPICES'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');
    }

    public function test_deletion_is_blocked_while_products_exist(): void
    {
        $admin = $this->admin();
        $parent = $this->category('SPICES');
        $this->product($parent, 'Pepper');

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/categories/{$parent->id}")
            ->assertStatus(409);

        $this->assertDatabaseHas('product_categories', ['id' => $parent->id]);
    }

    public function test_deletion_is_blocked_while_subcategories_exist(): void
    {
        $admin = $this->admin();
        $parent = $this->category('SPICES');
        $this->category('Turmeric', $parent->id);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/categories/{$parent->id}")
            ->assertStatus(409);

        $this->assertDatabaseHas('product_categories', ['id' => $parent->id]);
    }

    public function test_an_empty_category_can_be_deleted(): void
    {
        $admin = $this->admin();
        $parent = $this->category('SPICES');

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/categories/{$parent->id}")
            ->assertOk();

        $this->assertDatabaseMissing('product_categories', ['id' => $parent->id]);
    }

    public function test_public_categories_expose_parents_with_their_active_children(): void
    {
        $parent = $this->category('SPICES');
        $child = $this->category('Turmeric', $parent->id);
        $hidden = $this->category('Hidden sub', $parent->id);
        $hidden->update(['active' => false]);

        $inactiveParent = $this->category('GONE');
        $inactiveParent->update(['active' => false]);

        $response = $this->getJson('/api/catalog/categories');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $parent->id)
            ->assertJsonPath('data.0.children.0.id', $child->id);

        $parentNames = collect($response->json('data'))->pluck('name');
        $childNames = collect($response->json('data.0.children'))->pluck('name');

        $this->assertFalse($parentNames->contains('GONE'));
        $this->assertFalse($childNames->contains('Hidden sub'));
    }

    public function test_parent_filter_includes_direct_and_subcategory_products_without_duplicates(): void
    {
        $parent = $this->category('SPICES');
        $sub = $this->category('Turmeric', $parent->id);
        $other = $this->category('SWEETS');

        $direct = $this->product($parent, 'Direct spice product');
        $subProduct = $this->product($sub, 'Turmeric product');
        $otherProduct = $this->product($other, 'Sweet product');

        $response = $this->getJson("/api/catalog/products?category_id={$parent->id}");

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($direct->id, $ids);
        $this->assertContains($subProduct->id, $ids);
        $this->assertNotContains($otherProduct->id, $ids);
        $this->assertSame(count($ids), count(array_unique($ids)), 'Products must not be duplicated.');
    }

    public function test_subcategory_filter_returns_only_its_own_products(): void
    {
        $parent = $this->category('SPICES');
        $sub = $this->category('Turmeric', $parent->id);

        $direct = $this->product($parent, 'Direct spice product');
        $subProduct = $this->product($sub, 'Turmeric product');

        $response = $this->getJson("/api/catalog/products?category_id={$sub->id}");

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($subProduct->id, $ids);
        $this->assertNotContains($direct->id, $ids);
    }

    public function test_existing_direct_parent_product_assignments_are_preserved(): void
    {
        $parent = $this->category('SPICES');
        $product = $this->product($parent, 'Pepper');

        // No filter: the product assigned directly to a parent stays visible.
        $response = $this->getJson('/api/catalog/products');
        $response->assertOk();

        $this->assertContains($product->id, collect($response->json('data'))->pluck('id')->all());
        $this->assertDatabaseHas('products', ['id' => $product->id, 'category_id' => $parent->id]);
    }
}
