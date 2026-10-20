<?php

namespace Tests\Feature;

use App\Models\HomePageBanner;
use App\Models\HomePageLogo;
use App\Models\HomePageTeamMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

/**
 * Home Page Administration (Logo + Our Team) and the public read-only
 * endpoints, plus the safe banner-image replacement behaviour.
 *
 * Uploads are redirected to a throwaway directory so the real shared
 * uploads/ folder is never touched by the tests. A real 1x1 PNG is used so the
 * `image` / `mimes` rules pass without the GD extension.
 */
class HomePageAdministrationTest extends TestCase
{
    use RefreshDatabase;

    /** A valid 1x1 PNG (no GD required to validate it). */
    private const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    private string $uploads;

    protected function setUp(): void
    {
        parent::setUp();

        $this->uploads = sys_get_temp_dir().DIRECTORY_SEPARATOR.'sut_uploads_'.uniqid();
        File::ensureDirectoryExists($this->uploads);
        config(['uploads.base_path' => $this->uploads]);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->uploads);
        parent::tearDown();
    }

    private function superAdmin(): User
    {
        return User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => User::ROLE_ADMIN]);
    }

    private function png(string $name = 'image.png'): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'sutpng').'.png';
        file_put_contents($path, base64_decode(self::PNG_BASE64));

        return new UploadedFile($path, $name, 'image/png', null, true);
    }

    private function storedFile(string $reference): string
    {
        return $this->uploads.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $reference);
    }

    public function test_guests_are_rejected_from_home_page_administration(): void
    {
        $this->getJson('/api/admin/home-page/logo')->assertUnauthorized();
        $this->postJson('/api/admin/home-page/team', ['name' => 'A', 'role' => 'B'])->assertUnauthorized();
        $this->getJson('/api/admin/home-page/team')->assertUnauthorized();
    }

    public function test_only_super_admin_may_manage_the_home_page(): void
    {
        $user = User::factory()->create(); // USER role

        $this->actingAs($user, 'sanctum')->getJson('/api/admin/home-page/logo')->assertForbidden();
        $this->actingAs($user, 'sanctum')->getJson('/api/admin/home-page/team')->assertForbidden();

        // A regular ADMIN cannot reach the SUPER_ADMIN-only home-page endpoints.
        $admin = $this->admin();
        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/home-page/logo')->assertForbidden();
        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/home-page/team', ['name' => 'A', 'role' => 'B'])
            ->assertForbidden();
    }

    public function test_logo_is_null_until_the_first_upload(): void
    {
        $super = $this->superAdmin();

        $response = $this->actingAs($super, 'sanctum')->getJson('/api/admin/home-page/logo');

        $response->assertOk();
        // The empty singleton is serialised as {} by Laravel (same as the
        // existing vision endpoint), so there is no `data` key yet.
        $this->assertNull($response->json('data'));
        $this->assertSame(0, HomePageLogo::query()->count());
    }

    public function test_super_admin_can_upload_a_logo_and_it_is_publicly_retrievable(): void
    {
        $super = $this->superAdmin();

        $response = $this->actingAs($super, 'sanctum')->post('/api/admin/home-page/logo', [
            'image' => $this->png('brand.png'),
        ], ['Accept' => 'application/json']);

        $response->assertOk();

        $reference = $response->json('data.imageUrl');
        $this->assertIsString($reference);
        $this->assertStringStartsWith('logo/', $reference);
        $this->assertFileExists($this->storedFile($reference));

        $this->assertDatabaseHas('home_page_logo', ['image_url' => $reference]);

        // Only a single singleton row is ever created.
        $this->assertSame(1, HomePageLogo::query()->count());

        // Public endpoint exposes the saved reference.
        $this->getJson('/api/catalog/logo')
            ->assertOk()
            ->assertJsonPath('data.imageUrl', $reference);
    }

    public function test_replacing_the_logo_stores_the_new_file_and_removes_the_old_one(): void
    {
        $super = $this->superAdmin();

        $first = $this->actingAs($super, 'sanctum')
            ->post('/api/admin/home-page/logo', ['image' => $this->png()], ['Accept' => 'application/json'])
            ->json('data.imageUrl');

        $second = $this->actingAs($super, 'sanctum')
            ->post('/api/admin/home-page/logo', ['image' => $this->png()], ['Accept' => 'application/json'])
            ->json('data.imageUrl');

        $this->assertNotSame($first, $second);
        $this->assertFileExists($this->storedFile($second));
        $this->assertFileDoesNotExist($this->storedFile($first));
        $this->assertSame(1, HomePageLogo::query()->count());
        $this->assertDatabaseHas('home_page_logo', ['image_url' => $second]);
    }

    public function test_logo_upload_requires_a_valid_image(): void
    {
        $super = $this->superAdmin();

        // Missing image.
        $this->actingAs($super, 'sanctum')
            ->post('/api/admin/home-page/logo', [], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('image');

        // Wrong file type.
        $bad = UploadedFile::fake()->create('notes.txt', 1, 'text/plain');
        $this->actingAs($super, 'sanctum')
            ->post('/api/admin/home-page/logo', ['image' => $bad], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('image');

        $this->assertSame(0, HomePageLogo::query()->count());
    }

    public function test_team_member_requires_name_and_role(): void
    {
        $super = $this->superAdmin();

        $this->actingAs($super, 'sanctum')
            ->postJson('/api/admin/home-page/team', ['role' => 'Director'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');

        $this->actingAs($super, 'sanctum')
            ->postJson('/api/admin/home-page/team', ['name' => 'Asha'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('role');

        $this->assertSame(0, HomePageTeamMember::query()->count());
    }

    public function test_team_member_full_lifecycle(): void
    {
        $super = $this->superAdmin();

        // Create, without a photo (photo is optional).
        $created = $this->actingAs($super, 'sanctum')->postJson('/api/admin/home-page/team', [
            'name' => 'Asha Rao',
            'role' => 'Managing Director',
            'about' => 'Leads the company.',
            'message' => 'Rooted in tradition.',
            'display_order' => 2,
            'active' => true,
        ]);

        $created->assertCreated()
            ->assertJsonPath('data.name', 'Asha Rao')
            ->assertJsonPath('data.role', 'Managing Director')
            ->assertJsonPath('data.active', true)
            ->assertJsonPath('data.displayOrder', 2);

        $id = $created->json('data.id');
        $this->assertDatabaseHas('home_page_team_members', [
            'id' => $id,
            'name' => 'Asha Rao',
            'display_order' => 2,
        ]);

        // Update (no photo) and disable.
        $this->actingAs($super, 'sanctum')->postJson("/api/admin/home-page/team/{$id}", [
            'name' => 'Asha Rao',
            'role' => 'Chairperson',
            'display_order' => 1,
            'active' => false,
        ])->assertOk()->assertJsonPath('data.role', 'Chairperson')
            ->assertJsonPath('data.active', false);

        $this->assertDatabaseHas('home_page_team_members', [
            'id' => $id,
            'role' => 'Chairperson',
            'active' => false,
        ]);

        // Delete.
        $this->actingAs($super, 'sanctum')
            ->deleteJson("/api/admin/home-page/team/{$id}")
            ->assertOk();

        $this->assertDatabaseMissing('home_page_team_members', ['id' => $id]);
    }

    public function test_team_photo_is_stored_under_team_and_replaced_safely(): void
    {
        $super = $this->superAdmin();

        $created = $this->actingAs($super, 'sanctum')->post('/api/admin/home-page/team', [
            'name' => 'Vikram Shetty',
            'role' => 'Director',
            'photo' => $this->png('photo.png'),
            'display_order' => 0,
            'active' => true,
        ], ['Accept' => 'application/json'])->assertCreated();

        $id = $created->json('data.id');
        $firstPhoto = $created->json('data.photoUrl');

        $this->assertIsString($firstPhoto);
        $this->assertStringStartsWith('team/', $firstPhoto);
        $this->assertFileExists($this->storedFile($firstPhoto));

        // Replace the photo.
        $updated = $this->actingAs($super, 'sanctum')->post("/api/admin/home-page/team/{$id}", [
            'name' => 'Vikram Shetty',
            'role' => 'Director',
            'photo' => $this->png('photo2.png'),
        ], ['Accept' => 'application/json'])->assertOk();

        $secondPhoto = $updated->json('data.photoUrl');
        $this->assertNotSame($firstPhoto, $secondPhoto);
        $this->assertFileExists($this->storedFile($secondPhoto));
        $this->assertFileDoesNotExist($this->storedFile($firstPhoto));

        // Remove the photo explicitly.
        $this->actingAs($super, 'sanctum')->post("/api/admin/home-page/team/{$id}", [
            'name' => 'Vikram Shetty',
            'role' => 'Director',
            'remove_photo' => true,
        ], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('data.photoUrl', null);

        $this->assertFileDoesNotExist($this->storedFile($secondPhoto));
    }

    public function test_team_photo_is_deleted_with_the_member(): void
    {
        $super = $this->superAdmin();

        $created = $this->actingAs($super, 'sanctum')->post('/api/admin/home-page/team', [
            'name' => 'Meera Nair',
            'role' => 'Head of Operations',
            'photo' => $this->png(),
        ], ['Accept' => 'application/json'])->assertCreated();

        $id = $created->json('data.id');
        $photo = $created->json('data.photoUrl');
        $this->assertFileExists($this->storedFile($photo));

        $this->actingAs($super, 'sanctum')->deleteJson("/api/admin/home-page/team/{$id}")->assertOk();

        $this->assertFileDoesNotExist($this->storedFile($photo));
    }

    public function test_public_team_lists_only_enabled_members_in_display_order(): void
    {
        HomePageTeamMember::create(['name' => 'Second', 'role' => 'Director', 'active' => true, 'display_order' => 2]);
        HomePageTeamMember::create(['name' => 'First', 'role' => 'Chairperson', 'active' => true, 'display_order' => 1]);
        HomePageTeamMember::create(['name' => 'Hidden', 'role' => 'Advisor', 'active' => false, 'display_order' => 0]);

        $response = $this->getJson('/api/catalog/team');

        $response->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'First')
            ->assertJsonPath('data.1.name', 'Second');
    }

    public function test_banner_image_replacement_updates_reference_and_swaps_file(): void
    {
        // Banners are managed from Home Page Administration, i.e. SUPER_ADMIN.
        $super = $this->superAdmin();

        $created = $this->actingAs($super, 'sanctum')->post('/api/admin/banners', [
            'title' => 'Festive',
            'image' => $this->png('banner.png'),
            'active' => true,
            'display_order' => 1,
        ], ['Accept' => 'application/json'])->assertCreated();

        $id = $created->json('data.id');
        $firstImage = $created->json('data.imageUrl');
        $this->assertFileExists($this->storedFile($firstImage));

        $updated = $this->actingAs($super, 'sanctum')->post("/api/admin/banners/{$id}", [
            'title' => 'Festive',
            'image' => $this->png('banner2.png'),
            'active' => false,
            'display_order' => 1,
        ], ['Accept' => 'application/json'])->assertOk();

        $secondImage = $updated->json('data.imageUrl');
        $this->assertNotSame($firstImage, $secondImage);
        $this->assertFileExists($this->storedFile($secondImage));
        $this->assertFileDoesNotExist($this->storedFile($firstImage));

        $this->assertDatabaseHas('home_page_banners', [
            'id' => $id,
            'image_url' => $secondImage,
            'active' => false,
        ]);
        $this->assertSame(1, HomePageBanner::query()->count());
    }
}
