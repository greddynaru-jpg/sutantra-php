-- MySQL dump 10.13  Distrib 8.4.9, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: db_sutantra_laravel
-- ------------------------------------------------------
-- Server version	8.4.9

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `addresses`
--

DROP TABLE IF EXISTS `addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `addresses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `label` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Home',
  `recipient_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address_line` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `landmark` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `state` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pincode` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `addresses_user_id_created_at_index` (`user_id`,`created_at`),
  CONSTRAINT `addresses_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `addresses`
--

LOCK TABLES `addresses` WRITE;
/*!40000 ALTER TABLE `addresses` DISABLE KEYS */;
INSERT INTO `addresses` VALUES (5,9,'Home','NItee','7702611919','E-703, ACCURATE WIND CHIMES,NARSINGI','opp HP Petrole Pump','Hyderabad','Telangana','500075','2026-10-20 12:10:02','2026-10-20 12:10:02'),(6,9,'Home','Lohita','7702611919','Food Court,Sumadhura Accropolis,Nankaramguda','opp Glass onions','hyderabad','telangana','500089','2026-10-20 12:11:49','2026-10-20 12:11:49'),(7,12,'Home','Nitee','9346057384','703 raaga central court','opp HP Petrole Pump','hyderabad','telangana','500089','2026-10-20 12:18:08','2026-10-20 12:18:31'),(8,10,'Home','Sushma','7702486111','A-1203,Accurate Wind Chimes','HP Petrolepump','hyderabad','Telanagan','500075','2026-10-20 12:23:23','2026-10-20 12:23:23');
/*!40000 ALTER TABLE `addresses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` bigint NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache`
--

LOCK TABLES `cache` WRITE;
/*!40000 ALTER TABLE `cache` DISABLE KEYS */;
INSERT INTO `cache` VALUES ('laravel-cache-0716d9708d321ffb6a00818614779e779925365c','i:2;',1791887246),('laravel-cache-0716d9708d321ffb6a00818614779e779925365c:timer','i:1791887246;',1791887246),('laravel-cache-0a57cb53ba59c46fc4b692527a38a87c78d84028','i:20;',1792520529),('laravel-cache-0a57cb53ba59c46fc4b692527a38a87c78d84028:timer','i:1792520529;',1792520529),('laravel-cache-0ade7c2cf97f75d009975f4d720d1fa6c19f4897','i:2;',1793008747),('laravel-cache-0ade7c2cf97f75d009975f4d720d1fa6c19f4897:timer','i:1793008747;',1793008747),('laravel-cache-1574bddb75c78a6fd2251d61e2993b5146201319','i:2;',1791887245),('laravel-cache-1574bddb75c78a6fd2251d61e2993b5146201319:timer','i:1791887245;',1791887245),('laravel-cache-4d134bc072212ace2df385dae143139da74ec0ef','i:6;',1792498979),('laravel-cache-4d134bc072212ace2df385dae143139da74ec0ef:timer','i:1792498979;',1792498979),('laravel-cache-5c785c036466adea360111aa28563bfd556b5fba','i:3;',1793012357),('laravel-cache-5c785c036466adea360111aa28563bfd556b5fba:timer','i:1793012357;',1793012357),('laravel-cache-7719a1c782a1ba91c031a682a0a2f8658209adbf','i:15;',1792520336),('laravel-cache-7719a1c782a1ba91c031a682a0a2f8658209adbf:timer','i:1792520336;',1792520336),('laravel-cache-7b52009b64fd0a2a49e6d8a939753077792b0554','i:2;',1792552463),('laravel-cache-7b52009b64fd0a2a49e6d8a939753077792b0554:timer','i:1792552463;',1792552463),('laravel-cache-887309d048beef83ad3eabf2a79a64a389ab1c9f','i:14;',1792499161),('laravel-cache-887309d048beef83ad3eabf2a79a64a389ab1c9f:timer','i:1792499161;',1792499161),('laravel-cache-94d92f976fd06fd3e8cf53ec4e03d646','i:2;',1792839286),('laravel-cache-94d92f976fd06fd3e8cf53ec4e03d646:timer','i:1792839286;',1792839286),('laravel-cache-a75f3f172bfb296f2e10cbfc6dfc1883','i:5;',1791885524),('laravel-cache-a75f3f172bfb296f2e10cbfc6dfc1883:timer','i:1791885523;',1791885524),('laravel-cache-b1d5781111d84f7b3fe45a0852e59758cd7a87e5','i:1;',1792577730),('laravel-cache-b1d5781111d84f7b3fe45a0852e59758cd7a87e5:timer','i:1792577730;',1792577730),('laravel-cache-b3f0c7f6bb763af1be91d9e74eabfeb199dc1f1f','i:3;',1792241283),('laravel-cache-b3f0c7f6bb763af1be91d9e74eabfeb199dc1f1f:timer','i:1792241283;',1792241283),('laravel-cache-bc33ea4e26e5e1af1408321416956113a4658763','i:13;',1792517441),('laravel-cache-bc33ea4e26e5e1af1408321416956113a4658763:timer','i:1792517441;',1792517441),('laravel-cache-d435a6cdd786300dff204ee7c2ef942d3e9034e2','i:10;',1792491730),('laravel-cache-d435a6cdd786300dff204ee7c2ef942d3e9034e2:timer','i:1792491730;',1792491730),('laravel-cache-f1abd670358e036c31296e66b3b66c382ac00812','i:2;',1791885495),('laravel-cache-f1abd670358e036c31296e66b3b66c382ac00812:timer','i:1791885495;',1791885495),('laravel-cache-f6e1126cedebf23e1463aee73f9df08783640400','i:6;',1792499047),('laravel-cache-f6e1126cedebf23e1463aee73f9df08783640400:timer','i:1792499047;',1792499047),('laravel-cache-fa35e192121eabf3dabf9f5ea6abdbcbc107ac3b','i:3;',1791883443),('laravel-cache-fa35e192121eabf3dabf9f5ea6abdbcbc107ac3b:timer','i:1791883443;',1791883443),('laravel-cache-fe5dbbcea5ce7e2988b8c69bcfdfde8904aabc1f','i:10;',1792924899),('laravel-cache-fe5dbbcea5ce7e2988b8c69bcfdfde8904aabc1f:timer','i:1792924899;',1792924899);
/*!40000 ALTER TABLE `cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache_locks`
--

DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` bigint NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache_locks`
--

LOCK TABLES `cache_locks` WRITE;
/*!40000 ALTER TABLE `cache_locks` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache_locks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cart_items`
--

DROP TABLE IF EXISTS `cart_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cart_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `cart_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cart_items_cart_id_product_id_unique` (`cart_id`,`product_id`),
  KEY `cart_items_product_id_foreign` (`product_id`),
  CONSTRAINT `cart_items_cart_id_foreign` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cart_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cart_items`
--

LOCK TABLES `cart_items` WRITE;
/*!40000 ALTER TABLE `cart_items` DISABLE KEYS */;
INSERT INTO `cart_items` VALUES (7,4,34,1,180.00,'2026-10-08 09:32:35','2026-10-08 09:32:35'),(47,16,72,1,160.00,'2026-10-21 04:42:17','2026-10-21 04:42:17'),(48,16,71,2,549.00,'2026-10-21 04:42:19','2026-10-21 04:42:22');
/*!40000 ALTER TABLE `cart_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `carts`
--

DROP TABLE IF EXISTS `carts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `carts_user_id_foreign` (`user_id`),
  CONSTRAINT `carts_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carts`
--

LOCK TABLES `carts` WRITE;
/*!40000 ALTER TABLE `carts` DISABLE KEYS */;
INSERT INTO `carts` VALUES (4,13,'ACTIVE','2026-10-07 12:23:06','2026-10-07 12:23:06'),(5,9,'ACTIVE','2026-10-07 12:26:42','2026-10-07 12:26:42'),(15,12,'ACTIVE','2026-10-20 12:16:11','2026-10-20 12:16:11'),(16,10,'ACTIVE','2026-10-20 12:22:13','2026-10-20 12:22:13');
/*!40000 ALTER TABLE `carts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `delivery_pincodes`
--

DROP TABLE IF EXISTS `delivery_pincodes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_pincodes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `pincode` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `delivery_charge` decimal(10,2) NOT NULL DEFAULT '0.00',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `delivery_pincodes_pincode_unique` (`pincode`),
  KEY `delivery_pincodes_active_index` (`active`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delivery_pincodes`
--

LOCK TABLES `delivery_pincodes` WRITE;
/*!40000 ALTER TABLE `delivery_pincodes` DISABLE KEYS */;
INSERT INTO `delivery_pincodes` VALUES (2,'500075',20.00,1,'2026-10-20 14:10:08','2026-10-20 14:10:08'),(3,'500089',40.00,1,'2026-10-20 14:10:08','2026-10-20 14:10:08');
/*!40000 ALTER TABLE `delivery_pincodes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `failed_jobs`
--

LOCK TABLES `failed_jobs` WRITE;
/*!40000 ALTER TABLE `failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `home_page_banners`
--

DROP TABLE IF EXISTS `home_page_banners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `home_page_banners` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subtitle` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '0',
  `display_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `home_page_banners`
--

LOCK TABLES `home_page_banners` WRITE;
/*!40000 ALTER TABLE `home_page_banners` DISABLE KEYS */;
INSERT INTO `home_page_banners` VALUES (4,'kids',NULL,'banners/f4272c1d-35b1-4b25-b180-f69e595e38f6.webp',NULL,1,0,'2026-10-09 08:05:11','2026-10-10 10:34:57'),(5,'general',NULL,'banners/8afee5f6-3bb5-4462-bf21-41dc8b107b5c.webp',NULL,1,2,'2026-10-09 08:06:38','2026-10-10 13:47:15'),(6,'senior',NULL,'banners/fe064869-722d-445b-acb9-5c5f3c52e61c.webp',NULL,1,3,'2026-10-09 08:07:13','2026-10-10 13:47:43'),(7,'corporate',NULL,'banners/4b6492b2-a6f2-41ed-a453-30e55619e969.webp',NULL,1,1,'2026-10-09 08:07:44','2026-10-10 13:46:52'),(8,'kid1',NULL,'banners/9651b209-2ea6-4ffd-aef0-c8057be61c87.webp',NULL,1,5,'2026-10-10 13:49:13','2026-10-10 13:49:13'),(9,'kid2',NULL,'banners/73fbd4b3-f81f-45e9-aaf7-4358d83f16fa.webp',NULL,1,6,'2026-10-10 13:49:53','2026-10-10 13:49:53');
/*!40000 ALTER TABLE `home_page_banners` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `home_page_logo`
--

DROP TABLE IF EXISTS `home_page_logo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `home_page_logo` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `home_page_logo`
--

LOCK TABLES `home_page_logo` WRITE;
/*!40000 ALTER TABLE `home_page_logo` DISABLE KEYS */;
INSERT INTO `home_page_logo` VALUES (1,'logo/ec503f7e-e8f8-4a5c-a211-07597d2b82f2.jpeg','2026-10-17 04:53:41','2026-10-20 12:31:20');
/*!40000 ALTER TABLE `home_page_logo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `home_page_policies`
--

DROP TABLE IF EXISTS `home_page_policies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `home_page_policies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `display_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `home_page_policies_slug_unique` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `home_page_policies`
--

LOCK TABLES `home_page_policies` WRITE;
/*!40000 ALTER TABLE `home_page_policies` DISABLE KEYS */;
INSERT INTO `home_page_policies` VALUES (1,'about-us','About Us','At **Sutantra Foods**, we celebrate the richness of India\'s culinary heritage by bringing traditional flavours and homemade goodness to every home. From delightful sweets and crispy dry snacks to authentic pickles and aromatic spices, every product reflects our love for traditional recipes, quality ingredients, and the joy of sharing good food.\n\nWe believe food is more than just nourishment ΓÇö it connects generations, preserves cherished traditions, and creates beautiful memories. With a commitment to quality, authenticity, and care, we strive to bring you flavours that remind you of home and the timeless taste of Indian cuisine.\n\n**Rooted in Tradition. Crafted with Care. Shared with Love.**\n\nAt Sutantra Foods, every flavour tells a story, and every bite brings tradition closer to home.',1,1,'2026-10-10 02:53:59','2026-10-10 12:57:37'),(2,'privacy-policy','Privacy Policy','At **Sutantra Foods**, we respect your privacy and are committed to protecting your personal information. We collect only the information necessary to process orders, provide customer support, and improve your shopping experience.\n\nYour information is handled securely and is not sold to third parties. We may share relevant details with trusted service providers when necessary to process payments or deliver orders.\n\nWe take reasonable steps to protect your data and retain it only as required for business or legal purposes. By using our website, you agree to this Privacy Policy.\n\nFor privacy-related questions or requests, please contact Sutantra Foods through our official contact details.',1,2,'2026-10-10 02:53:59','2026-10-10 12:58:37'),(3,'terms-and-conditions','Terms and Conditions','Welcome to **Sutantra Foods**. By accessing or purchasing from our website, you agree to the following terms and conditions.\n\n- **Products:** We strive to provide accurate product descriptions, images, and prices. Minor variations in appearance may occur.\n- **Orders & Payments:** All orders are subject to availability and confirmation. Payments must be completed through the available payment methods.\n- **Pricing:** Prices and offers may change without prior notice.\n- **Shipping & Delivery:** Delivery timelines may vary depending on location and availability.\n- **Cancellations & Refunds:** Order cancellations, returns, and refunds are subject to our applicable policies.\n- **Product Quality:** Please contact us promptly if you receive a damaged, incorrect, or defective product.\n- **Privacy:** Customer information is handled in accordance with our Privacy Policy.\n- **Changes to Terms:** Sutantra Foods reserves the right to update these terms when necessary.\n\nBy using our website, you agree to these terms. For questions or assistance, please contact Sutantra Foods through our official contact details.',1,3,'2026-10-10 02:53:59','2026-10-10 13:32:00'),(4,'shipping-and-delivery-policy','Shipping and Delivery Policy','This Shipping and Delivery Policy describes how Sutantra Foods delivers orders.\n\n[To be confirmed by the business before publishing: the areas served, delivery timelines, delivery charges, order cut-off times, and how delivery issues are handled.]\n\nThis draft must be reviewed and approved by the business before it is published.',1,4,'2026-10-10 02:53:59','2026-10-10 02:53:59'),(5,'cancellation-returns-and-refund-policy','Cancellation, Returns and Refund Policy','This Cancellation, Returns and Refund Policy explains how cancellations, returns, and refunds are handled for Sutantra Foods orders.\n\n[To be confirmed by the business before publishing: the cancellation window, the conditions under which returns are accepted, the refund method and timelines, and who bears return costs.]\n\nThis draft must be reviewed and approved by the business before it is published.',1,5,'2026-10-10 02:53:59','2026-10-10 02:53:59'),(6,'contact-us','Contact Us','We would be glad to hear from you. This page lists the ways you can contact Sutantra Foods.\n\nPH:7702611919',1,6,'2026-10-10 02:53:59','2026-10-10 05:07:09');
/*!40000 ALTER TABLE `home_page_policies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `home_page_team_members`
--

DROP TABLE IF EXISTS `home_page_team_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `home_page_team_members` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `about` text COLLATE utf8mb4_unicode_ci,
  `message` text COLLATE utf8mb4_unicode_ci,
  `photo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `display_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `home_page_team_members`
--

LOCK TABLES `home_page_team_members` WRITE;
/*!40000 ALTER TABLE `home_page_team_members` DISABLE KEYS */;
/*!40000 ALTER TABLE `home_page_team_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `home_page_vision`
--

DROP TABLE IF EXISTS `home_page_vision`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `home_page_vision` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `heading` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vision_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `home_page_vision`
--

LOCK TABLES `home_page_vision` WRITE;
/*!40000 ALTER TABLE `home_page_vision` DISABLE KEYS */;
INSERT INTO `home_page_vision` VALUES (1,'Our Vision','Our vision is to bring the richness of traditional Indian flavours into every home through delicious sweets, crispy dry snacks, authentic pickles, and flavourful spices.\n\n**Rooted in Tradition. Crafted with Care. Shared with Love.**','2026-10-10 05:03:18','2026-10-10 12:07:58');
/*!40000 ALTER TABLE `home_page_vision` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_batches`
--

DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_batches`
--

LOCK TABLES `job_batches` WRITE;
/*!40000 ALTER TABLE `job_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'0001_01_01_000000_create_users_table',1),(2,'0001_01_01_000001_create_cache_table',1),(3,'0001_01_01_000002_create_jobs_table',1),(4,'2026_10_13_042648_create_personal_access_tokens_table',1),(5,'2026_10_13_100000_add_role_and_phone_to_users_table',2),(6,'2026_10_13_100001_create_product_categories_table',2),(7,'2026_10_13_100002_create_products_table',2),(8,'2026_10_13_100003_create_home_page_banners_table',2),(9,'2026_10_13_100004_create_home_page_policies_table',2),(10,'2026_10_13_100005_create_home_page_vision_table',2),(11,'2026_10_13_100006_create_carts_table',2),(12,'2026_10_13_100007_create_cart_items_table',2),(13,'2026_10_13_100008_create_orders_table',2),(14,'2026_10_13_100009_create_order_items_table',2),(15,'2026_10_13_100010_create_payments_table',2),(17,'2026_10_16_120000_add_parent_id_to_product_categories_table',3),(18,'2026_10_17_100000_create_home_page_logo_table',4),(19,'2026_10_17_100001_create_home_page_team_members_table',4),(20,'2026_10_19_100000_create_offer_codes_table',5),(21,'2026_10_20_100000_create_delivery_pincodes_table',6),(22,'2026_10_20_110000_create_addresses_table',7),(23,'2026_10_25_100000_create_user_addresses_table',8),(24,'2026_10_25_110000_create_order_statuses_table',9);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `offer_codes`
--

DROP TABLE IF EXISTS `offer_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `offer_codes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `discount_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `min_order_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `max_discount` decimal(10,2) DEFAULT NULL,
  `starts_at` date DEFAULT NULL,
  `expires_at` date DEFAULT NULL,
  `usage_limit` int unsigned DEFAULT NULL,
  `per_customer_limit` int unsigned DEFAULT NULL,
  `used_count` int unsigned NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `offer_codes_code_unique` (`code`),
  KEY `offer_codes_is_active_index` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `offer_codes`
--

LOCK TABLES `offer_codes` WRITE;
/*!40000 ALTER TABLE `offer_codes` DISABLE KEYS */;
INSERT INTO `offer_codes` VALUES (2,'WELCOME10','New Registration users','PERCENTAGE',10.00,0.00,NULL,'2026-10-19','2026-10-23',NULL,NULL,0,1,'2026-10-19 03:17:52','2026-10-19 03:17:52'),(12,'DIWALI100','Diwali Dhamaka Offer','FIXED',100.00,1000.00,NULL,'2026-10-28','2026-11-10',NULL,NULL,0,1,'2026-10-20 22:01:30','2026-10-20 22:01:30');
/*!40000 ALTER TABLE `offer_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `product_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `unit` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_items_order_id_foreign` (`order_id`),
  KEY `order_items_product_id_foreign` (`product_id`),
  CONSTRAINT `order_items_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` VALUES (25,20,71,'Kaju Pakam (Cashew chikki)',2,549.00,1098.00,'250g','2026-10-20 22:09:30','2026-10-20 22:09:30'),(26,21,38,'Bellam Laddu',2,220.00,440.00,'500 GM','2026-10-24 03:04:18','2026-10-24 03:04:18'),(27,22,71,'Kaju Pakam (Cashew chikki)',1,549.00,549.00,'250g','2026-10-24 05:26:48','2026-10-24 05:26:48');
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_statuses`
--

DROP TABLE IF EXISTS `order_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_statuses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_protected` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_statuses_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_statuses`
--

LOCK TABLES `order_statuses` WRITE;
/*!40000 ALTER TABLE `order_statuses` DISABLE KEYS */;
INSERT INTO `order_statuses` VALUES (1,'CREATED','Pending Approval',NULL,1,1,1,'2026-10-25 04:33:31','2026-10-25 04:33:31'),(2,'CONFIRMED','Approved',NULL,2,1,1,'2026-10-25 04:33:31','2026-10-25 04:33:31'),(3,'PROCESSING','Processing',NULL,3,1,1,'2026-10-25 04:33:31','2026-10-25 04:33:31'),(4,'SHIPPED','Dispatched',NULL,4,1,1,'2026-10-25 04:33:31','2026-10-25 04:33:31'),(5,'DELIVERED','Delivered',NULL,5,1,1,'2026-10-25 04:33:31','2026-10-25 04:33:31'),(6,'CANCELLED','Cancelled',NULL,6,1,1,'2026-10-25 04:33:31','2026-10-25 04:33:31');
/*!40000 ALTER TABLE `order_statuses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CREATED',
  `payment_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `delivery_charge` decimal(10,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INR',
  `customer_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `delivery_address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `orders_order_number_unique` (`order_number`),
  KEY `orders_user_id_index` (`user_id`),
  KEY `orders_created_at_index` (`created_at`),
  KEY `orders_status_index` (`status`),
  KEY `orders_payment_status_index` (`payment_status`),
  CONSTRAINT `orders_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (20,'SF261021T0VZ5D',9,'CREATED','PENDING',1098.00,0.00,40.00,0.00,1138.00,'INR','Lohita','7702611919','greddy.naru@gmail.com','Lohita\nFood Court,Sumadhura Accropolis,Nankaramguda\nLandmark: opp Glass onions\nhyderabad, telangana - 500089\nPhone: 7702611919','2026-10-20 22:09:30','2026-10-20 22:09:30'),(21,'SF261024GDWBED',9,'CREATED','PENDING',440.00,0.00,20.00,0.00,460.00,'INR','GReddy','7702611919','greddy.naru@gmail.com','GReddy\nE-703,ACCURATE WIND CHIMES,NARSINGI,HYDERABAD\nHyderabad, Telangana - 500075\nPhone: 7702611919','2026-10-24 03:04:17','2026-10-24 03:04:17'),(22,'SF261024SCCQAI',9,'CONFIRMED','PENDING',549.00,0.00,20.00,0.00,569.00,'INR','greddy','7702611919','greddy.naru@gmail.com','greddy\nE703, ACCURATE WIND CHMES\nHyderabad, Telangana - 500075\nPhone: 7702611919','2026-10-24 05:26:48','2026-10-25 23:00:03');
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `order_id` bigint unsigned NOT NULL,
  `gateway` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NONE',
  `payment_method` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway_order_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway_payment_id` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INR',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `payment_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `provider_reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payments_order_id_unique` (`order_id`),
  KEY `payments_status_index` (`status`),
  KEY `payments_created_at_index` (`created_at`),
  CONSTRAINT `payments_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_access_tokens`
--

DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB AUTO_INCREMENT=121 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_access_tokens`
--

LOCK TABLES `personal_access_tokens` WRITE;
/*!40000 ALTER TABLE `personal_access_tokens` DISABLE KEYS */;
INSERT INTO `personal_access_tokens` VALUES (30,'App\\Models\\User',9,'sutantra-web','89a1bf1be8e6ae979bda737bf38d0ed225cf1913043b7b14e7d9799fd6f24c64','[\"*\"]','2026-10-16 02:15:21',NULL,'2026-10-16 01:25:06','2026-10-16 02:15:21'),(35,'App\\Models\\User',9,'sutantra-web','5829dae565e058a989c2a4001c0c65d02bdac477551de6ffd3998aad739348f9','[\"*\"]','2026-10-16 03:38:00',NULL,'2026-10-16 03:37:39','2026-10-16 03:38:00'),(115,'App\\Models\\User',9,'sutantra-web','8c12b0951c68c814551f8a2163926364c2b4a5cc244615574816ab39fe46ab44','[\"*\"]','2026-10-26 04:28:08',NULL,'2026-10-24 02:58:49','2026-10-26 04:28:08'),(118,'App\\Models\\User',9,'sutantra-web','1d1f6df4615059b02647a07dbb109a9c08ce3a489a28b40ebbb8949960687f82','[\"*\"]','2026-10-26 03:30:49',NULL,'2026-10-24 05:23:54','2026-10-26 03:30:49');
/*!40000 ALTER TABLE `personal_access_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_categories`
--

DROP TABLE IF EXISTS `product_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` bigint unsigned DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_categories_name_unique` (`name`),
  KEY `product_categories_parent_id_index` (`parent_id`),
  CONSTRAINT `product_categories_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `product_categories` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_categories`
--

LOCK TABLES `product_categories` WRITE;
/*!40000 ALTER TABLE `product_categories` DISABLE KEYS */;
INSERT INTO `product_categories` VALUES (1,NULL,'SPICES','Traditional spices and spice powders',1,'categories/2db6b53c-0ee1-4da8-8d1a-5c9deab1fa8a.webp','2026-09-30 15:37:25','2026-10-10 14:04:22'),(2,NULL,'SWEETS','Traditional homemade sweets',1,'categories/06151dd8-f0c7-4fa7-aa02-d346f412410d.webp','2026-09-30 15:37:25','2026-10-10 14:04:49'),(3,NULL,'DRY_SNACKS','Traditional dry snacks',1,'categories/581839f5-274a-40ea-9cb7-515e58d2585a.webp','2026-09-30 15:37:25','2026-10-10 14:05:14'),(12,NULL,'PICKLES','Homemade traditional pickles',1,'categories/e4db157d-9553-4fa7-b124-b84d5353d5b3.webp','2026-10-05 12:35:08','2026-10-10 14:05:39'),(13,NULL,'MILLET_FOODS','Healthy millet-based food products',1,'categories/ed4607da-16b5-4ac6-ac63-0ab8e583378f.webp','2026-10-05 12:35:08','2026-10-10 10:57:28'),(14,NULL,'READY_TO_COOK','Ready-to-cook and instant food products',1,NULL,'2026-10-05 12:35:08','2026-10-05 12:35:08'),(15,NULL,'READY_TO_EAT','Ready-to-eat homemade food products',1,NULL,'2026-10-05 12:35:08','2026-10-05 12:35:08'),(16,NULL,'GIFT_HAMPERS','Food gift boxes and festival hampers',1,NULL,'2026-10-05 12:35:08','2026-10-05 12:35:08'),(19,1,'Powders','curry leaves',1,'categories/c840b63d-e348-4b70-9f25-9f507c2ebb2e.webp','2026-10-16 00:18:12','2026-10-16 00:26:06'),(22,1,'Yello powder',NULL,1,NULL,'2026-10-16 01:52:00','2026-10-16 01:52:00'),(23,16,'Sweet gift',NULL,1,NULL,'2026-10-16 01:52:55','2026-10-16 01:52:55');
/*!40000 ALTER TABLE `product_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category_id` bigint unsigned NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `unit` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `available` tinyint(1) NOT NULL DEFAULT '1',
  `stock_quantity` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `products_category_id_foreign` (`category_id`),
  CONSTRAINT `products_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `product_categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (34,'Guntur Chilli Powder','Traditional homemade Guntur chilli powder with authentic taste and aroma.',1,180.00,'500 GM','products/fe58592a-4590-4847-a1b4-7350f0d965a4.webp',1,100,'2026-10-05 13:22:52','2026-10-10 14:23:25'),(35,'Turmeric Powder','Pure homemade turmeric powder prepared from quality turmeric.',1,140.00,'500 GM','products/1e9f894e-9d31-4334-b7ce-0bd9a1250278.webp',1,10,'2026-10-05 13:22:52','2026-10-10 14:01:28'),(36,'Coriander Powder','Freshly prepared traditional coriander powder with rich aroma.',1,130.00,'500 GM','products/d3f75fc8-3601-412b-aca4-4fa8fa3eb27d.webp',1,13,'2026-10-05 13:22:52','2026-10-10 14:02:01'),(37,'Sambar Powder','Traditional homemade sambar masala with authentic South Indian flavour.',1,160.00,'250 GM','products/e1d9178c-d97a-46b2-b5b3-e397d395bd84.webp',1,25,'2026-10-05 13:22:52','2026-10-10 14:02:22'),(38,'Bellam Laddu','Traditional homemade jaggery laddu prepared with quality ingredients.',2,220.00,'500 GM','products/9926f2cc-72fb-49f6-be16-d28f343d4976.webp',1,10,'2026-10-05 13:22:52','2026-10-10 14:02:53'),(39,'Boondi Laddu','Traditional homemade boondi laddu with authentic festive taste.',2,240.00,'500 GM','products/9c7574d8-44ea-4509-a828-10cefba0f080.webp',1,20,'2026-10-05 13:22:52','2026-10-10 14:03:08'),(40,'Dry Fruit Laddu','Healthy homemade laddu prepared with selected dry fruits.',2,350.00,'500 GM','products/c6569a27-b04f-4408-a8ec-c127e5743547.webp',1,0,'2026-10-05 13:22:52','2026-10-10 10:29:44'),(41,'Rava Laddu','Soft and delicious traditional homemade rava laddu.',2,220.00,'500 GM','products/rava-laddu.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(42,'Chekkalu','Crispy traditional homemade rice flour snack.',3,180.00,'500 GM','products/chekkalu.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(43,'Murukku','Crispy traditional South Indian homemade snack.',3,190.00,'500 GM','products/murukku.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(44,'Kara Mixture','Crunchy spicy homemade traditional mixture.',3,200.00,'500 GM','products/kara-mixture.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(45,'Nippattu','Crispy traditional homemade snack with mildly spicy flavour.',3,190.00,'500 GM','products/nippattu.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(46,'Mango Pickle','Traditional homemade Andhra-style mango pickle.',12,220.00,'500 GM','products/mango-pickle.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(47,'Gongura Pickle','Authentic homemade Gongura pickle with traditional spices.',12,240.00,'500 GM','products/gongura-pickle.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(48,'Lemon Pickle','Traditional homemade lemon pickle with authentic taste.',12,200.00,'500 GM','products/lemon-pickle.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(49,'Ginger Pickle','Homemade ginger pickle prepared with traditional spices.',12,230.00,'500 GM','products/ginger-pickle.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(50,'Ragi Flour','Healthy millet flour suitable for traditional recipes.',13,150.00,'1 KG','products/ragi-flour.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(51,'Jowar Flour','Nutritious homemade-style jowar flour.',13,160.00,'1 KG','products/jowar-flour.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(52,'Bajra Flour','Healthy pearl millet flour suitable for everyday cooking.',13,170.00,'1 KG','products/bajra-flour.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(53,'Millet Breakfast Mix','Healthy millet-based instant breakfast mix.',13,180.00,'500 GM','products/millet-breakfast-mix.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(54,'Dosa Mix','Traditional instant dosa mix for quick homemade breakfast.',14,170.00,'500 GM','products/dosa-mix.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(55,'Idli Mix','Easy-to-prepare traditional idli mix.',14,160.00,'500 GM','products/idli-mix.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(56,'Upma Mix','Instant traditional upma mix for a quick breakfast.',14,150.00,'500 GM','products/upma-mix.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(57,'Ragi Dosa Mix','Healthy instant ragi dosa mix with traditional ingredients.',14,190.00,'500 GM','products/ragi-dosa-mix.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(58,'Homestyle Lemon Rice','Fresh homestyle lemon rice prepared with traditional ingredients.',15,120.00,'1 BOX','products/lemon-rice.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(59,'Homestyle Pulihora','Traditional South Indian tamarind rice prepared fresh.',15,130.00,'1 BOX','products/pulihora.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(60,'Homestyle Curd Rice','Fresh creamy curd rice prepared in traditional homestyle style.',15,120.00,'1 BOX','products/curd-rice.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(61,'Homestyle Veg Rice','Fresh homemade-style vegetable rice prepared with quality ingredients.',15,150.00,'1 BOX','products/veg-rice.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(62,'Traditional Snack Hamper','A selection of traditional homemade snacks packed as a gift.',16,650.00,'1 BOX','products/snack-hamper.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(63,'Festival Sweet Hamper','Traditional sweets packed as a festive gift hamper.',16,850.00,'1 BOX','products/sweet-hamper.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(64,'Spice Gift Hamper','A selection of traditional homemade spices and masalas.',16,750.00,'1 BOX','products/spice-hamper.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(65,'Sutantra Food Hamper','A curated combination of traditional sweets, snacks and spices.',16,999.00,'1 BOX','products/sutantra-food-hamper.webp',1,0,'2026-10-05 13:22:52','2026-10-05 13:22:52'),(71,'Kaju Pakam (Cashew chikki)','Prepared with ghee',2,549.00,'250g','products/0537d83c-7df5-4de7-8a7c-96239990610c.webp',1,22,'2026-10-20 13:08:19','2026-10-20 13:14:40'),(72,'Idli powder',NULL,1,160.00,'250g','products/6ff4f937-8259-4cd7-843a-35814ae268aa.jpeg',1,5,'2026-10-20 21:49:39','2026-10-20 21:49:39'),(73,'Palli powder',NULL,1,180.00,'100g','products/fafbb34b-c9ce-4a5d-8265-8ed0ec8d1327.jpg',1,0,'2026-10-20 21:53:05','2026-10-20 21:53:05');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
INSERT INTO `sessions` VALUES ('TMCFqyfNWwhccN3pPzGPqnI47A1UIsskh6wUoEtM',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','eyJfdG9rZW4iOiJ4VVpxcVRITzhoQXVaMXNvcFhvN0FGTkhVaXFWTmdLZHRWRzdtMEp3IiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAwIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791885062),('YZvgnfZj7iE402laXnRvLxXc6boxeapyAQ7UNnye',NULL,'127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36','eyJfdG9rZW4iOiJTcnlMM1pvYk15bFVLTU5PYkoyampMNlVKS2FQQ1dqOTMxb0ozSW5XIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDAwIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19',1791871618);
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_addresses`
--

DROP TABLE IF EXISTS `user_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_addresses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `state` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pincode` varchar(6) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_addresses_user_id_created_at_index` (`user_id`,`created_at`),
  CONSTRAINT `user_addresses_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_addresses`
--

LOCK TABLES `user_addresses` WRITE;
/*!40000 ALTER TABLE `user_addresses` DISABLE KEYS */;
INSERT INTO `user_addresses` VALUES (2,9,'greddy','7702611919','E703, ACCURATE WIND CHMES','Hyderabad','Telangana','500075',1,'2026-10-24 05:16:58','2026-10-24 05:16:58'),(3,9,'lohita','7702611919','H 1203,lan sum','Hyderabad','Telangana','500098',0,'2026-10-24 05:18:07','2026-10-24 05:26:23'),(4,9,'Nitee','7702611919','A 1203,ACCURATE WIND CHIMES,','Hyderabad','Telangana','500067',0,'2026-10-24 05:25:29','2026-10-24 05:25:29');
/*!40000 ALTER TABLE `user_addresses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USER',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `verification_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_phone_unique` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (8,'Kiran','kiran.m@gmail.com','900011787','ADMIN',1,NULL,NULL,'$2y$12$7ABObsI5CKVghoEdw.5sGe15T7OcpWFBrF7x5ZultssBEvTmeZqtm',NULL,'2026-09-27 13:51:03','2026-10-17 05:35:37'),(9,NULL,'greddy.naru@gmail.com','7702611919','SUPER_ADMIN',1,'543210',NULL,'$2y$12$DtTm9PVCl9iDwKaxhYjWjuKmP.EUwR/mF0fJonTqlH18L3fuSKl2.',NULL,'2026-09-28 13:53:59','2026-10-17 05:33:20'),(10,'Sushma','kk.hh@gmail.com','7702486111','SUPER_ADMIN',1,NULL,NULL,'$2y$12$FJltFTGZd5uaTLJmpsAPsO/J6POQMInX9/kBTxFetm4DBFgBEmU1q',NULL,'2026-09-28 17:23:59','2026-10-20 12:20:41'),(12,'sunita','lohi.reddy@gmail.com','9346057384','USER',1,NULL,NULL,'$2y$12$/5qvP8Um21sgqARDcCNZVOOYZhMQmyT9VE3dmyl0xJKAMMFOQLgiO',NULL,'2026-10-05 12:23:00','2026-10-20 21:30:10'),(13,NULL,'nitte.naru@gmail.com','9346057385','USER',1,'543210',NULL,'$2y$12$pAIYJtqUUVIHJ9lcjx8tTuTZ7Ro.V68Vw2SoxiSdZ.wnZ8fuPkXea',NULL,'2026-10-05 16:45:33','2026-10-13 03:47:31');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-26 16:40:46
