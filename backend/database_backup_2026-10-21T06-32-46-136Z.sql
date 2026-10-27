-- DATABASE BACKUP: realestate_admin
-- CREATED AT: 2026-10-21T06:32:46.033Z

SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS `app_settings`;
CREATE TABLE `app_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) DEFAULT 'DEVOJAS REALTORS',
  `company_logo_url` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `tagline` varchar(255) DEFAULT 'Your Trusted Real Estate Partner',
  `company_phone` varchar(255) DEFAULT NULL,
  `company_email` varchar(255) DEFAULT NULL,
  `company_address` text DEFAULT NULL,
  `company_gst` varchar(255) DEFAULT NULL,
  `company_rera` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `app_settings` (`id`, `company_name`, `company_logo_url`, `created_at`, `updated_at`, `tagline`, `company_phone`, `company_email`, `company_address`, `company_gst`, `company_rera`) VALUES (1, 'DEVOJAS REALTORS', 'http://localhost:5000/uploads/1790264265284-281677447.jpeg', '2026-09-02 10:50:43', '2026-09-24 15:37:47', 'Your Trusted Real Estate Partner', NULL, NULL, NULL, NULL, NULL);

DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `old_values` text DEFAULT NULL,
  `new_values` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `ip_address` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_entity` (`entity_type`,`entity_id`),
  KEY `idx_audit_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `banners`;
CREATE TABLE `banners` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `link_url` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `booking_forms`;
CREATE TABLE `booking_forms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `booking_ref` varchar(50) DEFAULT NULL,
  `project_id` int(11) DEFAULT NULL,
  `plot_id` int(11) DEFAULT NULL,
  `plot_code` varchar(50) DEFAULT NULL,
  `associate_id` int(11) DEFAULT NULL,
  `project_name` varchar(255) DEFAULT NULL,
  `plot_size` varchar(255) DEFAULT NULL,
  `size_unit` varchar(20) DEFAULT 'Sq.ft.',
  `sector_no` varchar(255) DEFAULT NULL,
  `plot_no` varchar(255) DEFAULT NULL,
  `rate_per_sqft` decimal(10,2) DEFAULT NULL,
  `basic_plot_price` decimal(10,2) DEFAULT NULL,
  `is_corner` tinyint(1) DEFAULT 0,
  `corner_percent` decimal(5,2) DEFAULT NULL,
  `corner_charge_amount` decimal(12,2) DEFAULT 0.00,
  `is_park_facing` tinyint(1) DEFAULT 0,
  `park_facing_percent` decimal(5,2) DEFAULT NULL,
  `park_facing_charge_amount` decimal(12,2) DEFAULT 0.00,
  `other_approved_charges` decimal(12,2) DEFAULT 0.00,
  `discount_amount` decimal(12,2) DEFAULT 0.00,
  `payment_plan_type` enum('full','emi') DEFAULT 'full',
  `total_plot_price` decimal(10,2) DEFAULT NULL,
  `payment_mode` varchar(255) DEFAULT NULL,
  `emi_duration_months` int(11) DEFAULT NULL,
  `down_payment_amt` decimal(10,2) DEFAULT NULL,
  `applicant_name` varchar(255) DEFAULT NULL,
  `applicant_phone` varchar(255) DEFAULT NULL,
  `applicant_date` date DEFAULT NULL,
  `applicant_place` varchar(255) DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `rejection_reason` text DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `client_id` int(11) DEFAULT NULL,
  `client_code` varchar(50) DEFAULT NULL,
  `father_husband_name` varchar(255) DEFAULT NULL,
  `applicant_email` varchar(255) DEFAULT NULL,
  `applicant_address` text DEFAULT NULL,
  `permanent_address` text DEFAULT NULL,
  `govt_id_type` varchar(50) DEFAULT NULL,
  `govt_id_number` varchar(100) DEFAULT NULL,
  `nominee_name` varchar(255) DEFAULT NULL,
  `nominee_relation` varchar(100) DEFAULT NULL,
  `selling_associate_name` varchar(255) DEFAULT NULL,
  `selling_associate_code` varchar(50) DEFAULT NULL,
  `selling_associate_ref_id` varchar(50) DEFAULT NULL,
  `direct_sponsor_id` int(11) DEFAULT NULL,
  `direct_sponsor_name` varchar(255) DEFAULT NULL,
  `direct_sponsor_code` varchar(50) DEFAULT NULL,
  `direct_sponsor_ref_id` varchar(50) DEFAULT NULL,
  `referral_chain_info` text DEFAULT NULL,
  `transaction_ref` varchar(100) DEFAULT NULL,
  `booking_amount` decimal(15,2) DEFAULT 0.00,
  `remaining_balance` decimal(15,2) DEFAULT 0.00,
  `emi_amount` decimal(12,2) DEFAULT NULL,
  `installment_frequency` varchar(50) DEFAULT 'monthly',
  `first_due_date` date DEFAULT NULL,
  `declaration_accepted` tinyint(1) DEFAULT 1,
  `allotment_status` enum('none','provisional','confirmed') DEFAULT 'none',
  `cancellation_reason` text DEFAULT NULL,
  `refund_amount` decimal(15,2) DEFAULT 0.00,
  `authorized_officer_name` varchar(255) DEFAULT NULL,
  `plot_length` decimal(10,2) DEFAULT NULL,
  `plot_width` decimal(10,2) DEFAULT NULL,
  `referred_id` varchar(100) DEFAULT NULL,
  `check_no` varchar(100) DEFAULT NULL,
  `upi_id` varchar(100) DEFAULT NULL,
  `bank_name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `associate_id` (`associate_id`),
  KEY `approved_by` (`approved_by`),
  CONSTRAINT `booking_forms_ibfk_1` FOREIGN KEY (`associate_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `booking_forms_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `booking_forms` (`id`, `booking_ref`, `project_id`, `plot_id`, `plot_code`, `associate_id`, `project_name`, `plot_size`, `size_unit`, `sector_no`, `plot_no`, `rate_per_sqft`, `basic_plot_price`, `is_corner`, `corner_percent`, `corner_charge_amount`, `is_park_facing`, `park_facing_percent`, `park_facing_charge_amount`, `other_approved_charges`, `discount_amount`, `payment_plan_type`, `total_plot_price`, `payment_mode`, `emi_duration_months`, `down_payment_amt`, `applicant_name`, `applicant_phone`, `applicant_date`, `applicant_place`, `status`, `rejection_reason`, `approved_by`, `approved_at`, `created_at`, `updated_at`, `client_id`, `client_code`, `father_husband_name`, `applicant_email`, `applicant_address`, `permanent_address`, `govt_id_type`, `govt_id_number`, `nominee_name`, `nominee_relation`, `selling_associate_name`, `selling_associate_code`, `selling_associate_ref_id`, `direct_sponsor_id`, `direct_sponsor_name`, `direct_sponsor_code`, `direct_sponsor_ref_id`, `referral_chain_info`, `transaction_ref`, `booking_amount`, `remaining_balance`, `emi_amount`, `installment_frequency`, `first_due_date`, `declaration_accepted`, `allotment_status`, `cancellation_reason`, `refund_amount`, `authorized_officer_name`, `plot_length`, `plot_width`, `referred_id`, `check_no`, `upi_id`, `bank_name`) VALUES (2, 'TEST-BOOK-001', 4, 14, 'TEST-PLOT-001', 87, 'Sunrise Residency — TEST', '1000', 'Sq.ft.', '02', '104', '2000.00', '2000000.00', 0, '0.00', '0.00', 0, '0.00', '0.00', '0.00', '0.00', '', '2000000.00', 'NEFT / Bank Transfer', 18, '0.00', 'Demo Client', '9700000050', '2026-10-17', 'Varanasi', 'approved', NULL, 1, '2026-10-17 12:00:18', '2026-10-17 12:00:18', '2026-10-17 12:00:18', 89, 'TEST-CLIENT-001', 'Late Shri R. K. Sharma', 'demo-client@example.com', 'TEST ADDRESS, Sector 02, Test City', 'TEST ADDRESS, Sector 02, Test City', 'Aadhaar', '9876-5432-1099', 'Sunita Sharma', 'Spouse', 'Person D', 'TEST-D-005', 'TEST-D-005', 84, 'Person A', 'TEST-A-002', 'TEST-A-002', 'Person D (5%) -> Person A (7%) -> Ram (10%)', 'TEST-SALE-001', '200000.00', '1800000.00', '100000.00', 'monthly', '2026-11-16', 1, 'provisional', NULL, '0.00', 'Admin Controller', '40.00', '25.00', 'TEST-D-005', NULL, NULL, NULL);

DROP TABLE IF EXISTS `commission_histories`;
CREATE TABLE `commission_histories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `previous_percent` float NOT NULL,
  `new_percent` float NOT NULL,
  `changed_by` int(11) DEFAULT NULL,
  `effective_date` datetime NOT NULL DEFAULT current_timestamp(),
  `reason` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_comm_hist_user` (`user_id`),
  KEY `idx_comm_hist_date` (`effective_date`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `commission_histories` (`id`, `user_id`, `previous_percent`, `new_percent`, `changed_by`, `effective_date`, `reason`, `notes`, `created_at`, `updated_at`) VALUES (1, 41, 5, 10, 1, '2026-10-16 07:48:53', 'Promoted to Top Leader (10% Tier)', NULL, '2026-10-16 07:48:53', '2026-10-16 07:48:53');
INSERT INTO `commission_histories` (`id`, `user_id`, `previous_percent`, `new_percent`, `changed_by`, `effective_date`, `reason`, `notes`, `created_at`, `updated_at`) VALUES (2, 42, 5, 7, 1, '2026-10-16 07:48:53', 'Assigned 7% Partner Tier', NULL, '2026-10-16 07:48:53', '2026-10-16 07:48:53');
INSERT INTO `commission_histories` (`id`, `user_id`, `previous_percent`, `new_percent`, `changed_by`, `effective_date`, `reason`, `notes`, `created_at`, `updated_at`) VALUES (3, 43, 3, 4, 1, '2026-10-16 07:48:53', 'Assigned 4% Tier', NULL, '2026-10-16 07:48:53', '2026-10-16 07:48:53');
INSERT INTO `commission_histories` (`id`, `user_id`, `previous_percent`, `new_percent`, `changed_by`, `effective_date`, `reason`, `notes`, `created_at`, `updated_at`) VALUES (34, 83, 0, 10, NULL, '2026-10-17 12:00:18', 'Approved Top Leader Tier (10%)', NULL, '2026-10-17 12:00:18', '2026-10-17 12:00:18');
INSERT INTO `commission_histories` (`id`, `user_id`, `previous_percent`, `new_percent`, `changed_by`, `effective_date`, `reason`, `notes`, `created_at`, `updated_at`) VALUES (35, 84, 0, 7, NULL, '2026-10-17 12:00:18', 'Assigned 7% Partner Tier', NULL, '2026-10-17 12:00:18', '2026-10-17 12:00:18');
INSERT INTO `commission_histories` (`id`, `user_id`, `previous_percent`, `new_percent`, `changed_by`, `effective_date`, `reason`, `notes`, `created_at`, `updated_at`) VALUES (36, 85, 0, 4, NULL, '2026-10-17 12:00:18', 'Assigned 4% Partner Tier', NULL, '2026-10-17 12:00:18', '2026-10-17 12:00:18');
INSERT INTO `commission_histories` (`id`, `user_id`, `previous_percent`, `new_percent`, `changed_by`, `effective_date`, `reason`, `notes`, `created_at`, `updated_at`) VALUES (37, 86, 0, 6, NULL, '2026-10-17 12:00:18', 'Assigned 6% Partner Tier', NULL, '2026-10-17 12:00:18', '2026-10-17 12:00:18');
INSERT INTO `commission_histories` (`id`, `user_id`, `previous_percent`, `new_percent`, `changed_by`, `effective_date`, `reason`, `notes`, `created_at`, `updated_at`) VALUES (38, 87, 0, 5, NULL, '2026-10-17 12:00:18', 'Assigned 5% Tier', NULL, '2026-10-17 12:00:18', '2026-10-17 12:00:18');
INSERT INTO `commission_histories` (`id`, `user_id`, `previous_percent`, `new_percent`, `changed_by`, `effective_date`, `reason`, `notes`, `created_at`, `updated_at`) VALUES (39, 88, 0, 4, NULL, '2026-10-17 12:00:18', 'Assigned 4% Tier', NULL, '2026-10-17 12:00:18', '2026-10-17 12:00:18');

DROP TABLE IF EXISTS `commission_settings`;
CREATE TABLE `commission_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `seller_associate_percent` float DEFAULT 3,
  `seller_referrer_percent` float DEFAULT 1,
  `buyer_associate_percent` float DEFAULT 1.5,
  `buyer_referrer_percent` float DEFAULT 0.5,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `commission_settings` (`id`, `seller_associate_percent`, `seller_referrer_percent`, `buyer_associate_percent`, `buyer_referrer_percent`, `created_at`, `updated_at`) VALUES (1, 3, 1, 1.5, 0.5, '2026-08-16 06:10:51', '2026-08-16 06:10:51');

DROP TABLE IF EXISTS `commissions`;
CREATE TABLE `commissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transaction_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL COMMENT 'Associate who earns this commission',
  `role_level` enum('seller_associate','seller_referrer','buyer_associate','buyer_referrer') NOT NULL,
  `percent` float NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `status` enum('pending','approved','credited','paid','rejected','reversed','disputed') NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `downline_user_id` int(11) DEFAULT NULL,
  `level` int(11) DEFAULT 0,
  `base_amount` decimal(15,2) DEFAULT 0.00,
  `upline_percent` float DEFAULT 0,
  `downline_percent` float DEFAULT 0,
  `differential_percent` float DEFAULT 0,
  `is_flagged` tinyint(1) DEFAULT 0,
  `flag_reason` varchar(255) DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `reversal_reason` varchar(255) DEFAULT NULL,
  `slip_number` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `transaction_id` (`transaction_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `commissions_ibfk_47` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `commissions_ibfk_48` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `commissions` (`id`, `transaction_id`, `user_id`, `role_level`, `percent`, `amount`, `status`, `created_at`, `updated_at`, `downline_user_id`, `level`, `base_amount`, `upline_percent`, `downline_percent`, `differential_percent`, `is_flagged`, `flag_reason`, `approved_by`, `approved_at`, `paid_at`, `reversal_reason`, `slip_number`) VALUES (1, 3, 46, 'seller_associate', 2, '20000.00', 'credited', '2026-10-16 07:49:39', '2026-10-16 07:49:39', NULL, 0, '1000000.00', 2, 0, 2, 0, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `commissions` (`id`, `transaction_id`, `user_id`, `role_level`, `percent`, `amount`, `status`, `created_at`, `updated_at`, `downline_user_id`, `level`, `base_amount`, `upline_percent`, `downline_percent`, `differential_percent`, `is_flagged`, `flag_reason`, `approved_by`, `approved_at`, `paid_at`, `reversal_reason`, `slip_number`) VALUES (2, 3, 45, 'seller_referrer', 2, '20000.00', 'credited', '2026-10-16 07:49:39', '2026-10-16 07:49:39', 46, 1, '1000000.00', 4, 2, 2, 0, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `commissions` (`id`, `transaction_id`, `user_id`, `role_level`, `percent`, `amount`, `status`, `created_at`, `updated_at`, `downline_user_id`, `level`, `base_amount`, `upline_percent`, `downline_percent`, `differential_percent`, `is_flagged`, `flag_reason`, `approved_by`, `approved_at`, `paid_at`, `reversal_reason`, `slip_number`) VALUES (3, 3, 42, 'seller_referrer', 3, '30000.00', 'credited', '2026-10-16 07:49:39', '2026-10-16 07:49:39', 45, 2, '1000000.00', 7, 4, 3, 0, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `commissions` (`id`, `transaction_id`, `user_id`, `role_level`, `percent`, `amount`, `status`, `created_at`, `updated_at`, `downline_user_id`, `level`, `base_amount`, `upline_percent`, `downline_percent`, `differential_percent`, `is_flagged`, `flag_reason`, `approved_by`, `approved_at`, `paid_at`, `reversal_reason`, `slip_number`) VALUES (4, 3, 41, 'seller_referrer', 3, '30000.00', 'credited', '2026-10-16 07:49:39', '2026-10-16 07:49:39', 42, 3, '1000000.00', 10, 7, 3, 0, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `commissions` (`id`, `transaction_id`, `user_id`, `role_level`, `percent`, `amount`, `status`, `created_at`, `updated_at`, `downline_user_id`, `level`, `base_amount`, `upline_percent`, `downline_percent`, `differential_percent`, `is_flagged`, `flag_reason`, `approved_by`, `approved_at`, `paid_at`, `reversal_reason`, `slip_number`) VALUES (5, 4, 43, 'seller_associate', 4, '80000.00', 'credited', '2026-10-16 07:49:39', '2026-10-16 07:49:39', NULL, 0, '2000000.00', 4, 0, 4, 0, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `commissions` (`id`, `transaction_id`, `user_id`, `role_level`, `percent`, `amount`, `status`, `created_at`, `updated_at`, `downline_user_id`, `level`, `base_amount`, `upline_percent`, `downline_percent`, `differential_percent`, `is_flagged`, `flag_reason`, `approved_by`, `approved_at`, `paid_at`, `reversal_reason`, `slip_number`) VALUES (6, 4, 41, 'seller_referrer', 6, '120000.00', 'credited', '2026-10-16 07:49:39', '2026-10-16 07:49:39', 43, 1, '2000000.00', 10, 4, 6, 0, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `commissions` (`id`, `transaction_id`, `user_id`, `role_level`, `percent`, `amount`, `status`, `created_at`, `updated_at`, `downline_user_id`, `level`, `base_amount`, `upline_percent`, `downline_percent`, `differential_percent`, `is_flagged`, `flag_reason`, `approved_by`, `approved_at`, `paid_at`, `reversal_reason`, `slip_number`) VALUES (19, 10, 87, 'seller_associate', 5, '100000.00', 'pending', '2026-10-17 12:00:18', '2026-10-17 12:00:18', NULL, 0, '2000000.00', 5, 0, 5, 0, NULL, NULL, NULL, NULL, NULL, 'SLIP-TX10-U87-L0');
INSERT INTO `commissions` (`id`, `transaction_id`, `user_id`, `role_level`, `percent`, `amount`, `status`, `created_at`, `updated_at`, `downline_user_id`, `level`, `base_amount`, `upline_percent`, `downline_percent`, `differential_percent`, `is_flagged`, `flag_reason`, `approved_by`, `approved_at`, `paid_at`, `reversal_reason`, `slip_number`) VALUES (20, 10, 84, 'seller_referrer', 2, '40000.00', 'pending', '2026-10-17 12:00:18', '2026-10-17 12:00:18', 87, 1, '2000000.00', 7, 5, 2, 0, NULL, NULL, NULL, NULL, NULL, 'SLIP-TX10-U84-L1');
INSERT INTO `commissions` (`id`, `transaction_id`, `user_id`, `role_level`, `percent`, `amount`, `status`, `created_at`, `updated_at`, `downline_user_id`, `level`, `base_amount`, `upline_percent`, `downline_percent`, `differential_percent`, `is_flagged`, `flag_reason`, `approved_by`, `approved_at`, `paid_at`, `reversal_reason`, `slip_number`) VALUES (21, 10, 83, 'seller_referrer', 3, '60000.00', 'pending', '2026-10-17 12:00:18', '2026-10-17 12:00:18', 84, 2, '2000000.00', 10, 7, 3, 0, NULL, NULL, NULL, NULL, NULL, 'SLIP-TX10-U83-L2');

DROP TABLE IF EXISTS `complaints`;
CREATE TABLE `complaints` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `status` enum('open','in_progress','resolved') DEFAULT 'open',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `complaints_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `daily_records`;
CREATE TABLE `daily_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `type` enum('income','expense','other') DEFAULT 'income',
  `amount` decimal(15,2) NOT NULL,
  `record_date` date NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `category` varchar(255) DEFAULT 'General',
  `party_name` varchar(255) DEFAULT NULL,
  `party_phone` varchar(255) DEFAULT NULL,
  `payment_mode` enum('Cash','UPI','Bank Transfer (NEFT/RTGS)','Cheque') DEFAULT 'Cash',
  `reference_no` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`),
  CONSTRAINT `daily_records_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `daily_records_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `emi_installments`;
CREATE TABLE `emi_installments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `emi_plan_id` int(11) NOT NULL,
  `month_number` int(11) NOT NULL,
  `due_date` date NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `status` enum('pending','paid','overdue') DEFAULT 'pending',
  `paid_on` datetime DEFAULT NULL,
  `recorded_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `emi_plan_id` (`emi_plan_id`),
  CONSTRAINT `emi_installments_ibfk_1` FOREIGN KEY (`emi_plan_id`) REFERENCES `emi_plans` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `emi_installments` (`id`, `emi_plan_id`, `month_number`, `due_date`, `amount`, `status`, `paid_on`, `recorded_by`, `created_at`, `updated_at`) VALUES (1, 1, 1, '2026-08-01', '291666.67', 'pending', NULL, NULL, '2026-09-22 06:16:32', '2026-09-22 06:16:32');
INSERT INTO `emi_installments` (`id`, `emi_plan_id`, `month_number`, `due_date`, `amount`, `status`, `paid_on`, `recorded_by`, `created_at`, `updated_at`) VALUES (2, 1, 2, '2026-09-01', '291666.67', 'pending', NULL, NULL, '2026-09-22 06:16:32', '2026-09-22 06:16:32');
INSERT INTO `emi_installments` (`id`, `emi_plan_id`, `month_number`, `due_date`, `amount`, `status`, `paid_on`, `recorded_by`, `created_at`, `updated_at`) VALUES (3, 1, 3, '2026-10-01', '291666.67', 'pending', NULL, NULL, '2026-09-22 06:16:32', '2026-09-22 06:16:32');
INSERT INTO `emi_installments` (`id`, `emi_plan_id`, `month_number`, `due_date`, `amount`, `status`, `paid_on`, `recorded_by`, `created_at`, `updated_at`) VALUES (4, 1, 4, '2026-11-01', '291666.67', 'pending', NULL, NULL, '2026-09-22 06:16:32', '2026-09-22 06:16:32');
INSERT INTO `emi_installments` (`id`, `emi_plan_id`, `month_number`, `due_date`, `amount`, `status`, `paid_on`, `recorded_by`, `created_at`, `updated_at`) VALUES (5, 1, 5, '2026-12-01', '291666.67', 'pending', NULL, NULL, '2026-09-22 06:16:32', '2026-09-22 06:16:32');
INSERT INTO `emi_installments` (`id`, `emi_plan_id`, `month_number`, `due_date`, `amount`, `status`, `paid_on`, `recorded_by`, `created_at`, `updated_at`) VALUES (6, 1, 6, '2027-01-01', '291666.67', 'pending', NULL, NULL, '2026-09-22 06:16:32', '2026-09-22 06:16:32');
INSERT INTO `emi_installments` (`id`, `emi_plan_id`, `month_number`, `due_date`, `amount`, `status`, `paid_on`, `recorded_by`, `created_at`, `updated_at`) VALUES (7, 1, 7, '2027-02-01', '291666.67', 'pending', NULL, NULL, '2026-09-22 06:16:32', '2026-09-22 06:16:32');
INSERT INTO `emi_installments` (`id`, `emi_plan_id`, `month_number`, `due_date`, `amount`, `status`, `paid_on`, `recorded_by`, `created_at`, `updated_at`) VALUES (8, 1, 8, '2027-03-01', '291666.67', 'pending', NULL, NULL, '2026-09-22 06:16:32', '2026-09-22 06:16:32');
INSERT INTO `emi_installments` (`id`, `emi_plan_id`, `month_number`, `due_date`, `amount`, `status`, `paid_on`, `recorded_by`, `created_at`, `updated_at`) VALUES (9, 1, 9, '2027-04-01', '291666.67', 'pending', NULL, NULL, '2026-09-22 06:16:32', '2026-09-22 06:16:32');
INSERT INTO `emi_installments` (`id`, `emi_plan_id`, `month_number`, `due_date`, `amount`, `status`, `paid_on`, `recorded_by`, `created_at`, `updated_at`) VALUES (10, 1, 10, '2027-05-01', '291666.67', 'pending', NULL, NULL, '2026-09-22 06:16:32', '2026-09-22 06:16:32');
INSERT INTO `emi_installments` (`id`, `emi_plan_id`, `month_number`, `due_date`, `amount`, `status`, `paid_on`, `recorded_by`, `created_at`, `updated_at`) VALUES (11, 1, 11, '2027-06-01', '291666.67', 'pending', NULL, NULL, '2026-09-22 06:16:32', '2026-09-22 06:16:32');
INSERT INTO `emi_installments` (`id`, `emi_plan_id`, `month_number`, `due_date`, `amount`, `status`, `paid_on`, `recorded_by`, `created_at`, `updated_at`) VALUES (12, 1, 12, '2027-07-01', '291666.67', 'pending', NULL, NULL, '2026-09-22 06:16:32', '2026-09-22 06:16:32');

DROP TABLE IF EXISTS `emi_plans`;
CREATE TABLE `emi_plans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transaction_id` int(11) NOT NULL,
  `total_amount` decimal(15,2) NOT NULL,
  `down_payment` decimal(15,2) DEFAULT 0.00,
  `num_months` int(11) NOT NULL,
  `monthly_amount` decimal(15,2) NOT NULL,
  `start_date` date NOT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transaction_id` (`transaction_id`),
  CONSTRAINT `emi_plans_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `emi_plans` (`id`, `transaction_id`, `total_amount`, `down_payment`, `num_months`, `monthly_amount`, `start_date`, `created_by`, `created_at`, `updated_at`) VALUES (1, 2, '4500000.00', '1000000.00', 12, '291666.67', '2026-08-01', 1, '2026-09-22 06:16:32', '2026-09-22 06:16:32');

DROP TABLE IF EXISTS `enquiries`;
CREATE TABLE `enquiries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `preferred_location` varchar(255) DEFAULT NULL,
  `budget` varchar(255) DEFAULT NULL,
  `plot_size` varchar(255) DEFAULT NULL,
  `enquiry_type` varchar(255) DEFAULT NULL,
  `source` varchar(255) DEFAULT 'Website Frontend',
  `status` enum('new','contacted','closed') DEFAULT 'new',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL COMMENT 'null means it is for admin/global',
  `title` varchar(255) NOT NULL,
  `message` varchar(255) NOT NULL,
  `type` enum('kyc','deal','payout','plot','general') DEFAULT 'general',
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `created_at`, `updated_at`) VALUES (1, NULL, 'New KYC Submission', 'madhu submitted KYC documents for review.', 'kyc', 1, '2026-09-04 07:58:22', '2026-09-24 14:26:56');
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `created_at`, `updated_at`) VALUES (2, NULL, 'New Team Member Added', 'ishika added Ravindra prajapati to their team at 5%.', 'general', 0, '2026-09-28 15:14:34', '2026-09-28 15:14:34');
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `created_at`, `updated_at`) VALUES (3, 46, 'Commission Credited! 💰', 'You earned ₹20,000 (2%) for closing Deal #3.', 'deal', 0, '2026-10-16 07:49:39', '2026-10-16 07:49:39');
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `created_at`, `updated_at`) VALUES (4, 46, 'Milestone Reward Unlocked! 🎉', 'You reached Slab 2 self target and earned a reward of ₹25000.00.', 'payout', 0, '2026-10-16 07:49:39', '2026-10-16 07:49:39');
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `created_at`, `updated_at`) VALUES (5, 45, 'Differential Commission Credited! 📈', 'You earned ₹20,000 (2% differential) from Associate G (Field Executive)\'s deal on Transaction #3.', 'deal', 0, '2026-10-16 07:49:39', '2026-10-16 07:49:39');
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `created_at`, `updated_at`) VALUES (6, 42, 'Differential Commission Credited! 📈', 'You earned ₹30,000 (3% differential) from Associate G (Field Executive)\'s deal on Transaction #3.', 'deal', 0, '2026-10-16 07:49:39', '2026-10-16 07:49:39');
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `created_at`, `updated_at`) VALUES (7, 41, 'Differential Commission Credited! 📈', 'You earned ₹30,000 (3% differential) from Associate G (Field Executive)\'s deal on Transaction #3.', 'deal', 0, '2026-10-16 07:49:39', '2026-10-16 07:49:39');
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `created_at`, `updated_at`) VALUES (8, 43, 'Commission Credited! 💰', 'You earned ₹80,000 (4%) for closing Deal #4.', 'deal', 0, '2026-10-16 07:49:39', '2026-10-16 07:49:39');
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `created_at`, `updated_at`) VALUES (9, 43, 'Milestone Reward Unlocked! 🎉', 'You reached Slab 2 self target and earned a reward of ₹25000.00.', 'payout', 0, '2026-10-16 07:49:39', '2026-10-16 07:49:39');
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `created_at`, `updated_at`) VALUES (10, 41, 'Differential Commission Credited! 📈', 'You earned ₹1,20,000 (6% differential) from Associate C (Direct Partner)\'s deal on Transaction #4.', 'deal', 0, '2026-10-16 07:49:39', '2026-10-16 07:49:39');
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `created_at`, `updated_at`) VALUES (28, 87, 'Commission Generated (Pending Approval) ⏳', 'You earned ₹1,00,000 (5%) for closing Deal #10. Status: pending.', 'deal', 0, '2026-10-17 12:00:18', '2026-10-17 12:00:18');
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `created_at`, `updated_at`) VALUES (29, 87, 'Milestone Reward Unlocked! 🎉', 'You reached Slab 2 self target and earned a reward of ₹25000.00.', 'payout', 0, '2026-10-17 12:00:18', '2026-10-17 12:00:18');
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `created_at`, `updated_at`) VALUES (30, 84, 'Differential Commission Generated (Pending) ⏳', 'You earned ₹40,000 (2% differential) from Person D\'s deal on Transaction #10. Status: pending.', 'deal', 0, '2026-10-17 12:00:18', '2026-10-17 12:00:18');
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `created_at`, `updated_at`) VALUES (31, 83, 'Differential Commission Generated (Pending) ⏳', 'You earned ₹60,000 (3% differential) from Person D\'s deal on Transaction #10. Status: pending.', 'deal', 0, '2026-10-17 12:00:18', '2026-10-17 12:00:18');
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `created_at`, `updated_at`) VALUES (32, 87, 'Milestone Reward Unlocked! 🎉', 'You reached Slab 3 self target and earned a reward of ₹50000.00.', 'payout', 0, '2026-10-17 12:00:40', '2026-10-17 12:00:40');

DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transaction_id` int(11) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `recorded_by` int(11) NOT NULL COMMENT 'User id of associate/accounts who recorded this cash payment',
  `note` varchar(255) DEFAULT NULL,
  `paid_on` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `payment_mode` varchar(50) DEFAULT 'Cash',
  `reference_no` varchar(100) DEFAULT NULL,
  `receipt_no` varchar(100) DEFAULT NULL,
  `status` enum('pending','verified','rejected','refunded') DEFAULT 'verified',
  PRIMARY KEY (`id`),
  KEY `transaction_id` (`transaction_id`),
  KEY `recorded_by` (`recorded_by`),
  CONSTRAINT `payments_ibfk_31` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `payments_ibfk_32` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `payments` (`id`, `transaction_id`, `amount`, `recorded_by`, `note`, `paid_on`, `created_at`, `updated_at`, `payment_mode`, `reference_no`, `receipt_no`, `status`) VALUES (1, 1, '600000.00', 1, 'Down Payment Plan (20% initial booking)', '2026-09-22 06:15:09', '2026-09-22 06:15:09', '2026-09-22 06:15:09', 'Cash', NULL, NULL, 'verified');
INSERT INTO `payments` (`id`, `transaction_id`, `amount`, `recorded_by`, `note`, `paid_on`, `created_at`, `updated_at`, `payment_mode`, `reference_no`, `receipt_no`, `status`) VALUES (2, 2, '1000000.00', 1, 'Down Payment Amount', '2026-09-22 06:16:32', '2026-09-22 06:16:32', '2026-09-22 06:16:32', 'Cash', NULL, NULL, 'verified');
INSERT INTO `payments` (`id`, `transaction_id`, `amount`, `recorded_by`, `note`, `paid_on`, `created_at`, `updated_at`, `payment_mode`, `reference_no`, `receipt_no`, `status`) VALUES (4, 10, '200000.00', 1, 'Initial Booking Amount (10%) received for Sunrise Residency Plot 104', '2026-10-17 12:00:18', '2026-10-17 12:00:18', '2026-10-17 12:00:18', 'Bank Transfer / NEFT', 'UTR-TEST-2026-9901', 'REC-TEST-001', 'verified');

DROP TABLE IF EXISTS `payout_statements`;
CREATE TABLE `payout_statements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `associate_id` int(11) NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `payment_date` date NOT NULL,
  `self_business` decimal(15,2) DEFAULT 0.00,
  `team_business` decimal(15,2) DEFAULT 0.00,
  `total_business` decimal(15,2) DEFAULT 0.00,
  `slab_id` int(11) DEFAULT NULL,
  `slab_percent` float DEFAULT 0,
  `reward_amount` decimal(15,2) DEFAULT 0.00,
  `self_deposit` decimal(15,2) DEFAULT 0.00,
  `team_deposit` decimal(15,2) DEFAULT 0.00,
  `total_amount` decimal(15,2) DEFAULT 0.00,
  `tds_percent` float DEFAULT 5,
  `tds_amount` decimal(15,2) DEFAULT 0.00,
  `processing_percent` float DEFAULT 2,
  `processing_amount` decimal(15,2) DEFAULT 0.00,
  `net_payable` decimal(15,2) DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `status` enum('draft','published') DEFAULT 'published',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `associate_id` (`associate_id`),
  KEY `created_by` (`created_by`),
  KEY `slab_id` (`slab_id`),
  CONSTRAINT `payout_statements_ibfk_4` FOREIGN KEY (`associate_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `payout_statements_ibfk_5` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `payout_statements_ibfk_6` FOREIGN KEY (`slab_id`) REFERENCES `slabs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `payout_statements` (`id`, `associate_id`, `created_by`, `payment_date`, `self_business`, `team_business`, `total_business`, `slab_id`, `slab_percent`, `reward_amount`, `self_deposit`, `team_deposit`, `total_amount`, `tds_percent`, `tds_amount`, `processing_percent`, `processing_amount`, `net_payable`, `notes`, `status`, `created_at`, `updated_at`) VALUES (1, 42, 38, '2026-10-16', '500000.00', '1000000.00', '1500000.00', NULL, 7, '0.00', '35000.00', '70000.00', '105000.00', 5, '5250.00', 2, '2100.00', '97650.00', 'Monthly payout statement generated by Accounts department.', 'published', '2026-10-16 07:49:39', '2026-10-16 07:49:39');

DROP TABLE IF EXISTS `plots`;
CREATE TABLE `plots` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `plot_code` varchar(50) DEFAULT NULL,
  `project_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `location` varchar(255) NOT NULL,
  `city` varchar(255) DEFAULT NULL,
  `sector_number` varchar(50) DEFAULT NULL,
  `size_sqft` float NOT NULL,
  `rate_per_sqft` decimal(12,2) DEFAULT 0.00,
  `basic_price` decimal(15,2) DEFAULT 0.00,
  `corner_charge` decimal(12,2) DEFAULT 0.00,
  `park_facing_charge` decimal(12,2) DEFAULT 0.00,
  `additional_charges` decimal(12,2) DEFAULT 0.00,
  `discount` decimal(12,2) DEFAULT 0.00,
  `price` decimal(15,2) NOT NULL,
  `owner_id` int(11) NOT NULL COMMENT 'Client who owns/listed this plot',
  `image_url` varchar(255) DEFAULT NULL,
  `status` enum('pending','approved','rejected','available','booked','sold','under_negotiation') DEFAULT 'available',
  `is_featured` tinyint(1) DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `block` varchar(255) DEFAULT NULL COMMENT 'e.g. "Block A" — used by the public website inventory display',
  `plot_number` varchar(255) DEFAULT NULL,
  `dimensions` varchar(255) DEFAULT NULL COMMENT 'e.g. "40x60 ft"',
  `road_width` varchar(255) DEFAULT NULL COMMENT 'e.g. "30 ft"',
  `facing` varchar(255) DEFAULT NULL COMMENT 'e.g. "East", "North"',
  `is_corner` tinyint(1) DEFAULT 0,
  `is_park_facing` tinyint(1) DEFAULT 0,
  `allotment_status` enum('none','provisional','allotted','transferred','cancelled') DEFAULT 'none',
  `booking_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `owner_id` (`owner_id`),
  CONSTRAINT `plots_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `plots` (`id`, `plot_code`, `project_id`, `title`, `description`, `location`, `city`, `sector_number`, `size_sqft`, `rate_per_sqft`, `basic_price`, `corner_charge`, `park_facing_charge`, `additional_charges`, `discount`, `price`, `owner_id`, `image_url`, `status`, `is_featured`, `created_at`, `updated_at`, `block`, `plot_number`, `dimensions`, `road_width`, `facing`, `is_corner`, `is_park_facing`, `allotment_status`, `booking_date`) VALUES (1, NULL, NULL, 'Chandmari Residency — Sector 4, Plot 102', 'Prime 1200 sqft residential plot, Park facing with 30ft wide road access.', 'VDA Colony Chandmari, Varanasi', 'Varanasi', NULL, 1200, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '3000000.00', 12, NULL, 'sold', 0, '2026-09-22 06:15:09', '2026-09-22 06:15:09', NULL, NULL, NULL, NULL, NULL, 0, 0, 'none', NULL);
INSERT INTO `plots` (`id`, `plot_code`, `project_id`, `title`, `description`, `location`, `city`, `sector_number`, `size_sqft`, `rate_per_sqft`, `basic_price`, `corner_charge`, `park_facing_charge`, `additional_charges`, `discount`, `price`, `owner_id`, `image_url`, `status`, `is_featured`, `created_at`, `updated_at`, `block`, `plot_number`, `dimensions`, `road_width`, `facing`, `is_corner`, `is_park_facing`, `allotment_status`, `booking_date`) VALUES (2, NULL, NULL, 'Devojas Enclave — Sector 2, Plot 45', 'Corner plot 1500 sqft in high density residential township.', 'Sigra Main Road, Varanasi', 'Varanasi', NULL, 1500, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '4500000.00', 12, NULL, '', 0, '2026-09-22 06:15:09', '2026-09-22 06:15:09', NULL, NULL, NULL, NULL, NULL, 0, 0, 'none', NULL);
INSERT INTO `plots` (`id`, `plot_code`, `project_id`, `title`, `description`, `location`, `city`, `sector_number`, `size_sqft`, `rate_per_sqft`, `basic_price`, `corner_charge`, `park_facing_charge`, `additional_charges`, `discount`, `price`, `owner_id`, `image_url`, `status`, `is_featured`, `created_at`, `updated_at`, `block`, `plot_number`, `dimensions`, `road_width`, `facing`, `is_corner`, `is_park_facing`, `allotment_status`, `booking_date`) VALUES (3, NULL, NULL, 'Varanasi Smart City — Sector 1, Plot 12', 'Commercial front plot facing 60ft national highway.', 'Babatpur Airport Highway, Varanasi', 'Varanasi', NULL, 2000, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '8000000.00', 1, NULL, 'approved', 0, '2026-09-22 06:15:09', '2026-09-22 06:15:09', NULL, NULL, NULL, NULL, NULL, 0, 0, 'none', NULL);
INSERT INTO `plots` (`id`, `plot_code`, `project_id`, `title`, `description`, `location`, `city`, `sector_number`, `size_sqft`, `rate_per_sqft`, `basic_price`, `corner_charge`, `park_facing_charge`, `additional_charges`, `discount`, `price`, `owner_id`, `image_url`, `status`, `is_featured`, `created_at`, `updated_at`, `block`, `plot_number`, `dimensions`, `road_width`, `facing`, `is_corner`, `is_park_facing`, `allotment_status`, `booking_date`) VALUES (4, NULL, NULL, 'Demo Elite Plot #101', 'Demo plot used for testing ₹10,00,000 MLM differential distribution.', 'Kaithi, Varanasi', 'Varanasi', NULL, 1000, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '1000000.00', 40, NULL, 'sold', 1, '2026-10-16 07:49:39', '2026-10-16 07:49:39', NULL, NULL, NULL, NULL, NULL, 0, 0, 'none', NULL);
INSERT INTO `plots` (`id`, `plot_code`, `project_id`, `title`, `description`, `location`, `city`, `sector_number`, `size_sqft`, `rate_per_sqft`, `basic_price`, `corner_charge`, `park_facing_charge`, `additional_charges`, `discount`, `price`, `owner_id`, `image_url`, `status`, `is_featured`, `created_at`, `updated_at`, `block`, `plot_number`, `dimensions`, `road_width`, `facing`, `is_corner`, `is_park_facing`, `allotment_status`, `booking_date`) VALUES (5, NULL, NULL, 'Demo Royal Villa Plot #202', 'Demo plot used for testing 2-level differential distribution.', 'Sigra, Varanasi', 'Varanasi', NULL, 1500, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '2000000.00', 40, NULL, 'sold', 0, '2026-10-16 07:49:39', '2026-10-16 07:49:39', NULL, NULL, NULL, NULL, NULL, 0, 0, 'none', NULL);
INSERT INTO `plots` (`id`, `plot_code`, `project_id`, `title`, `description`, `location`, `city`, `sector_number`, `size_sqft`, `rate_per_sqft`, `basic_price`, `corner_charge`, `park_facing_charge`, `additional_charges`, `discount`, `price`, `owner_id`, `image_url`, `status`, `is_featured`, `created_at`, `updated_at`, `block`, `plot_number`, `dimensions`, `road_width`, `facing`, `is_corner`, `is_park_facing`, `allotment_status`, `booking_date`) VALUES (6, NULL, NULL, 'Demo Prime Commercial Plot #303', 'Available demo commercial plot for live tests.', 'Lanka, Varanasi', 'Varanasi', NULL, 2000, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '3000000.00', 40, NULL, 'available', 1, '2026-10-16 07:49:39', '2026-10-16 07:49:39', NULL, NULL, NULL, NULL, NULL, 0, 0, 'none', NULL);
INSERT INTO `plots` (`id`, `plot_code`, `project_id`, `title`, `description`, `location`, `city`, `sector_number`, `size_sqft`, `rate_per_sqft`, `basic_price`, `corner_charge`, `park_facing_charge`, `additional_charges`, `discount`, `price`, `owner_id`, `image_url`, `status`, `is_featured`, `created_at`, `updated_at`, `block`, `plot_number`, `dimensions`, `road_width`, `facing`, `is_corner`, `is_park_facing`, `allotment_status`, `booking_date`) VALUES (14, 'TEST-PLOT-001', 4, 'Sunrise Residency — Plot 104', '1000 sq.ft. prime residential plot in Sector 02.', 'Sector 02, Highway Corridor, Varanasi', 'Varanasi', '02', 1000, '2000.00', '2000000.00', '0.00', '0.00', '0.00', '0.00', '2000000.00', 89, NULL, 'booked', 0, '2026-10-17 12:00:18', '2026-10-17 12:00:18', 'Block A', '104', '25x40 ft', '40 ft', 'East', 0, 0, 'provisional', '2026-10-17');

DROP TABLE IF EXISTS `projects`;
CREATE TABLE `projects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` varchar(50) NOT NULL COMMENT 'Custom unique code, e.g. TEST-PROJ-001',
  `name` varchar(255) NOT NULL,
  `location` varchar(255) NOT NULL,
  `city` varchar(255) DEFAULT NULL,
  `developer_name` varchar(255) DEFAULT 'Devojas Realtors Pvt Ltd',
  `description` text DEFAULT NULL,
  `facilities` text DEFAULT NULL COMMENT 'e.g. 24/7 Security, Wide Roads, Park, Water Supply',
  `status` enum('active','upcoming','completed','hold') DEFAULT 'active',
  `total_plots` int(11) DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_id` (`project_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `projects` (`id`, `project_id`, `name`, `location`, `city`, `developer_name`, `description`, `facilities`, `status`, `total_plots`, `created_at`, `updated_at`) VALUES (4, 'TEST-PROJ-001', 'Sunrise Residency — TEST', 'Sector 02, Highway Corridor, Varanasi', 'Varanasi', 'Devojas Realtors Pvt Ltd', 'Premium master planned residential township with complete modern amenities.', '24x7 Security, 40ft Wide Roads, Underground Electricity, Parks, Club House', 'active', 50, '2026-10-17 12:00:18', '2026-10-17 12:00:18');

DROP TABLE IF EXISTS `reward_logs`;
CREATE TABLE `reward_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `slab_id` int(11) NOT NULL,
  `transaction_id` int(11) DEFAULT NULL,
  `reward_amount` decimal(15,2) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `slab_id` (`slab_id`),
  KEY `transaction_id` (`transaction_id`),
  CONSTRAINT `reward_logs_ibfk_46` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `reward_logs_ibfk_47` FOREIGN KEY (`slab_id`) REFERENCES `slabs` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `reward_logs_ibfk_48` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `reward_logs` (`id`, `user_id`, `slab_id`, `transaction_id`, `reward_amount`, `created_at`, `updated_at`) VALUES (1, 46, 2, 3, '25000.00', '2026-10-16 07:49:39', '2026-10-16 07:49:39');
INSERT INTO `reward_logs` (`id`, `user_id`, `slab_id`, `transaction_id`, `reward_amount`, `created_at`, `updated_at`) VALUES (2, 43, 2, 4, '25000.00', '2026-10-16 07:49:39', '2026-10-16 07:49:39');
INSERT INTO `reward_logs` (`id`, `user_id`, `slab_id`, `transaction_id`, `reward_amount`, `created_at`, `updated_at`) VALUES (8, 87, 2, 10, '25000.00', '2026-10-17 12:00:18', '2026-10-17 12:00:18');
INSERT INTO `reward_logs` (`id`, `user_id`, `slab_id`, `transaction_id`, `reward_amount`, `created_at`, `updated_at`) VALUES (9, 87, 3, 10, '50000.00', '2026-10-17 12:00:40', '2026-10-17 12:00:40');

DROP TABLE IF EXISTS `slabs`;
CREATE TABLE `slabs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `slab_number` int(11) NOT NULL,
  `min_amount` decimal(15,2) NOT NULL,
  `max_amount` decimal(15,2) NOT NULL,
  `percentage` float NOT NULL,
  `reward_amount` decimal(15,2) DEFAULT 0.00,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `self_target_amount` decimal(15,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slab_number` (`slab_number`),
  UNIQUE KEY `slab_number_2` (`slab_number`),
  UNIQUE KEY `slab_number_3` (`slab_number`),
  UNIQUE KEY `slab_number_4` (`slab_number`),
  UNIQUE KEY `slab_number_5` (`slab_number`),
  UNIQUE KEY `slab_number_6` (`slab_number`),
  UNIQUE KEY `slab_number_7` (`slab_number`),
  UNIQUE KEY `slab_number_8` (`slab_number`),
  UNIQUE KEY `slab_number_9` (`slab_number`),
  UNIQUE KEY `slab_number_10` (`slab_number`),
  UNIQUE KEY `slab_number_11` (`slab_number`),
  UNIQUE KEY `slab_number_12` (`slab_number`),
  UNIQUE KEY `slab_number_13` (`slab_number`),
  UNIQUE KEY `slab_number_14` (`slab_number`),
  UNIQUE KEY `slab_number_15` (`slab_number`),
  UNIQUE KEY `slab_number_16` (`slab_number`),
  UNIQUE KEY `slab_number_17` (`slab_number`),
  UNIQUE KEY `slab_number_18` (`slab_number`),
  UNIQUE KEY `slab_number_19` (`slab_number`),
  UNIQUE KEY `slab_number_20` (`slab_number`),
  UNIQUE KEY `slab_number_21` (`slab_number`),
  UNIQUE KEY `slab_number_22` (`slab_number`),
  UNIQUE KEY `slab_number_23` (`slab_number`),
  UNIQUE KEY `slab_number_24` (`slab_number`),
  UNIQUE KEY `slab_number_25` (`slab_number`),
  UNIQUE KEY `slab_number_26` (`slab_number`),
  UNIQUE KEY `slab_number_27` (`slab_number`),
  UNIQUE KEY `slab_number_28` (`slab_number`),
  UNIQUE KEY `slab_number_29` (`slab_number`),
  UNIQUE KEY `slab_number_30` (`slab_number`),
  UNIQUE KEY `slab_number_31` (`slab_number`),
  UNIQUE KEY `slab_number_32` (`slab_number`),
  UNIQUE KEY `slab_number_33` (`slab_number`),
  UNIQUE KEY `slab_number_34` (`slab_number`),
  UNIQUE KEY `slab_number_35` (`slab_number`),
  UNIQUE KEY `slab_number_36` (`slab_number`),
  UNIQUE KEY `slab_number_37` (`slab_number`),
  UNIQUE KEY `slab_number_38` (`slab_number`),
  UNIQUE KEY `slab_number_39` (`slab_number`),
  UNIQUE KEY `slab_number_40` (`slab_number`),
  UNIQUE KEY `slab_number_41` (`slab_number`),
  UNIQUE KEY `slab_number_42` (`slab_number`),
  UNIQUE KEY `slab_number_43` (`slab_number`),
  UNIQUE KEY `slab_number_44` (`slab_number`),
  UNIQUE KEY `slab_number_45` (`slab_number`),
  UNIQUE KEY `slab_number_46` (`slab_number`),
  UNIQUE KEY `slab_number_47` (`slab_number`),
  UNIQUE KEY `slab_number_48` (`slab_number`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `slabs` (`id`, `slab_number`, `min_amount`, `max_amount`, `percentage`, `reward_amount`, `created_at`, `updated_at`, `self_target_amount`) VALUES (1, 1, '0.00', '1000000.00', 5, '10000.00', '2026-09-02 10:50:43', '2026-09-23 18:26:01', '500000.00');
INSERT INTO `slabs` (`id`, `slab_number`, `min_amount`, `max_amount`, `percentage`, `reward_amount`, `created_at`, `updated_at`, `self_target_amount`) VALUES (2, 2, '1000000.00', '2500000.00', 7, '25000.00', '2026-09-02 10:50:43', '2026-09-23 18:26:01', '750000.00');
INSERT INTO `slabs` (`id`, `slab_number`, `min_amount`, `max_amount`, `percentage`, `reward_amount`, `created_at`, `updated_at`, `self_target_amount`) VALUES (3, 3, '2500000.00', '7500000.00', 9, '50000.00', '2026-09-02 10:50:43', '2026-09-23 18:26:01', '1500000.00');
INSERT INTO `slabs` (`id`, `slab_number`, `min_amount`, `max_amount`, `percentage`, `reward_amount`, `created_at`, `updated_at`, `self_target_amount`) VALUES (4, 4, '7500000.00', '15000000.00', 10, '150000.00', '2026-09-02 10:50:43', '2026-09-23 18:26:01', '2500000.00');
INSERT INTO `slabs` (`id`, `slab_number`, `min_amount`, `max_amount`, `percentage`, `reward_amount`, `created_at`, `updated_at`, `self_target_amount`) VALUES (5, 5, '15000000.00', '30000000.00', 11, '300000.00', '2026-09-02 10:50:43', '2026-09-23 18:26:01', '3500000.00');
INSERT INTO `slabs` (`id`, `slab_number`, `min_amount`, `max_amount`, `percentage`, `reward_amount`, `created_at`, `updated_at`, `self_target_amount`) VALUES (6, 6, '30000000.00', '60000000.00', 12, '450000.00', '2026-09-02 10:50:43', '2026-09-23 18:26:01', '5000000.00');
INSERT INTO `slabs` (`id`, `slab_number`, `min_amount`, `max_amount`, `percentage`, `reward_amount`, `created_at`, `updated_at`, `self_target_amount`) VALUES (7, 7, '60000000.00', '100000000.00', 13, '800000.00', '2026-09-02 10:50:43', '2026-09-23 18:26:01', '7500000.00');
INSERT INTO `slabs` (`id`, `slab_number`, `min_amount`, `max_amount`, `percentage`, `reward_amount`, `created_at`, `updated_at`, `self_target_amount`) VALUES (8, 8, '100000000.00', '150000000.00', 14, '1000000.00', '2026-09-02 10:50:43', '2026-09-23 18:26:01', '10000000.00');
INSERT INTO `slabs` (`id`, `slab_number`, `min_amount`, `max_amount`, `percentage`, `reward_amount`, `created_at`, `updated_at`, `self_target_amount`) VALUES (9, 9, '150000000.00', '250000000.00', 15, '1500000.00', '2026-09-02 10:50:43', '2026-09-23 18:26:01', '12500000.00');
INSERT INTO `slabs` (`id`, `slab_number`, `min_amount`, `max_amount`, `percentage`, `reward_amount`, `created_at`, `updated_at`, `self_target_amount`) VALUES (10, 10, '250000000.00', '500000000.00', 16, '2000000.00', '2026-09-02 10:50:43', '2026-09-23 18:26:01', '15000000.00');
INSERT INTO `slabs` (`id`, `slab_number`, `min_amount`, `max_amount`, `percentage`, `reward_amount`, `created_at`, `updated_at`, `self_target_amount`) VALUES (11, 11, '500000000.00', '750000000.00', 17, '3000000.00', '2026-09-02 10:50:43', '2026-09-23 18:26:01', '17500000.00');
INSERT INTO `slabs` (`id`, `slab_number`, `min_amount`, `max_amount`, `percentage`, `reward_amount`, `created_at`, `updated_at`, `self_target_amount`) VALUES (12, 12, '750000000.00', '1000000000.00', 18, '5000000.00', '2026-09-02 10:50:43', '2026-09-23 18:26:01', '20000000.00');

DROP TABLE IF EXISTS `sms_logs`;
CREATE TABLE `sms_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `phone` varchar(20) NOT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'credentials',
  `status` enum('sent','failed','mock_delivered') NOT NULL DEFAULT 'sent',
  `provider` varchar(50) NOT NULL DEFAULT 'mock',
  `message_snippet` varchar(255) DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_sms_phone` (`phone`),
  KEY `idx_sms_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `transactions`;
CREATE TABLE `transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transaction_ref` varchar(100) DEFAULT NULL,
  `plot_id` int(11) NOT NULL,
  `buyer_id` int(11) NOT NULL,
  `seller_id` int(11) NOT NULL,
  `seller_associate_id` int(11) DEFAULT NULL COMMENT 'Associate who helped seller',
  `buyer_associate_id` int(11) DEFAULT NULL COMMENT 'Associate who helped buyer',
  `amount` decimal(15,2) NOT NULL,
  `status` enum('pending','completed','cancelled') DEFAULT 'pending',
  `payment_status` enum('unpaid','paid','refunded') DEFAULT 'unpaid',
  `deal_date` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `paid_amount` decimal(15,2) DEFAULT 0.00 COMMENT 'Running total of cash received against this deal',
  `is_self_sale` tinyint(1) DEFAULT 0 COMMENT 'True if the associate creating the transaction is themselves the buyer/seller associate',
  PRIMARY KEY (`id`),
  KEY `plot_id` (`plot_id`),
  KEY `buyer_id` (`buyer_id`),
  KEY `seller_id` (`seller_id`),
  KEY `seller_associate_id` (`seller_associate_id`),
  KEY `buyer_associate_id` (`buyer_associate_id`),
  CONSTRAINT `transactions_ibfk_118` FOREIGN KEY (`plot_id`) REFERENCES `plots` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `transactions_ibfk_119` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `transactions_ibfk_120` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `transactions_ibfk_121` FOREIGN KEY (`seller_associate_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `transactions_ibfk_122` FOREIGN KEY (`buyer_associate_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `transactions` (`id`, `transaction_ref`, `plot_id`, `buyer_id`, `seller_id`, `seller_associate_id`, `buyer_associate_id`, `amount`, `status`, `payment_status`, `deal_date`, `created_at`, `updated_at`, `paid_amount`, `is_self_sale`) VALUES (1, NULL, 1, 12, 1, NULL, 11, '3000000.00', 'completed', 'unpaid', '2026-09-22 06:15:09', '2026-09-22 06:15:09', '2026-09-22 06:15:09', '1100000.00', 0);
INSERT INTO `transactions` (`id`, `transaction_ref`, `plot_id`, `buyer_id`, `seller_id`, `seller_associate_id`, `buyer_associate_id`, `amount`, `status`, `payment_status`, `deal_date`, `created_at`, `updated_at`, `paid_amount`, `is_self_sale`) VALUES (2, NULL, 2, 12, 1, NULL, 11, '4500000.00', 'completed', 'unpaid', '2026-09-22 06:16:32', '2026-09-22 06:16:32', '2026-09-22 06:16:32', '1000000.00', 0);
INSERT INTO `transactions` (`id`, `transaction_ref`, `plot_id`, `buyer_id`, `seller_id`, `seller_associate_id`, `buyer_associate_id`, `amount`, `status`, `payment_status`, `deal_date`, `created_at`, `updated_at`, `paid_amount`, `is_self_sale`) VALUES (3, NULL, 4, 39, 40, 46, NULL, '1000000.00', 'completed', 'paid', '2026-10-16 07:49:39', '2026-10-16 07:49:39', '2026-10-16 07:49:39', '1000000.00', 0);
INSERT INTO `transactions` (`id`, `transaction_ref`, `plot_id`, `buyer_id`, `seller_id`, `seller_associate_id`, `buyer_associate_id`, `amount`, `status`, `payment_status`, `deal_date`, `created_at`, `updated_at`, `paid_amount`, `is_self_sale`) VALUES (4, NULL, 5, 39, 40, 43, NULL, '2000000.00', 'completed', 'paid', '2026-10-13 07:49:39', '2026-10-16 07:49:39', '2026-10-16 07:49:39', '2000000.00', 0);
INSERT INTO `transactions` (`id`, `transaction_ref`, `plot_id`, `buyer_id`, `seller_id`, `seller_associate_id`, `buyer_associate_id`, `amount`, `status`, `payment_status`, `deal_date`, `created_at`, `updated_at`, `paid_amount`, `is_self_sale`) VALUES (10, 'TEST-SALE-001', 14, 89, 1, 87, 87, '2000000.00', 'completed', 'unpaid', '2026-10-17 12:00:18', '2026-10-17 12:00:18', '2026-10-17 12:00:18', '200000.00', 0);

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','client','associate','accounts') DEFAULT 'client',
  `referred_by` int(11) DEFAULT NULL COMMENT 'ID of the associate who referred this user',
  `kyc_status` enum('pending','approved','rejected','not_submitted') DEFAULT 'not_submitted',
  `kyc_document_url` varchar(255) DEFAULT NULL,
  `status` enum('active','blocked','pending_approval') DEFAULT 'active',
  `referral_code` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `pan_number` varchar(255) DEFAULT NULL,
  `aadhar_number` varchar(255) DEFAULT NULL,
  `referral_commission_percent` float DEFAULT NULL COMMENT 'Fixed % this user gives to their own referrer (set by referrer at creation time)',
  `total_business_volume` decimal(15,2) DEFAULT 0.00 COMMENT 'Running total of deals this associate has personally closed (drives slab)',
  `current_slab_id` int(11) DEFAULT NULL COMMENT 'Which slab this associate currently falls into based on total_business_volume',
  `last_login_at` datetime DEFAULT NULL COMMENT 'Timestamp of the most recent successful login — shown on dashboard',
  `login_id` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL COMMENT 'ID of admin who approved the associate',
  `approved_at` datetime DEFAULT NULL,
  `rejection_reason` varchar(255) DEFAULT NULL,
  `commission_percent` float DEFAULT 5 COMMENT 'Current commission percentage for this associate',
  `commission_set_by` enum('system','admin','upline') DEFAULT 'system' COMMENT 'Who last updated the commission percent',
  `self_business_volume` decimal(15,2) DEFAULT 0.00 COMMENT 'Total volume of deals closed by this associate themselves (drives rewards)',
  `plain_password` varchar(255) DEFAULT NULL COMMENT 'Stores password for admin visibility during approval',
  `profile_image` varchar(255) DEFAULT NULL,
  `is_fixed_associate` tinyint(1) DEFAULT 0 COMMENT 'True for the 6 pre-defined associate login accounts (devojas-0001 to devojas-0006)',
  `is_temporary_password` tinyint(1) DEFAULT 0,
  `temporary_password_expires_at` datetime DEFAULT NULL,
  `last_sms_sent_at` datetime DEFAULT NULL,
  `last_sms_status` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone` (`phone`),
  UNIQUE KEY `phone_2` (`phone`),
  UNIQUE KEY `phone_3` (`phone`),
  UNIQUE KEY `phone_4` (`phone`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `pan_number` (`pan_number`),
  UNIQUE KEY `aadhar_number` (`aadhar_number`),
  UNIQUE KEY `referral_code` (`referral_code`),
  UNIQUE KEY `login_id` (`login_id`),
  UNIQUE KEY `email_2` (`email`),
  UNIQUE KEY `referral_code_2` (`referral_code`),
  UNIQUE KEY `pan_number_2` (`pan_number`),
  UNIQUE KEY `aadhar_number_2` (`aadhar_number`),
  UNIQUE KEY `login_id_2` (`login_id`),
  UNIQUE KEY `email_3` (`email`),
  UNIQUE KEY `referral_code_3` (`referral_code`),
  UNIQUE KEY `pan_number_3` (`pan_number`),
  UNIQUE KEY `aadhar_number_3` (`aadhar_number`),
  UNIQUE KEY `login_id_3` (`login_id`),
  UNIQUE KEY `email_4` (`email`),
  UNIQUE KEY `referral_code_4` (`referral_code`),
  UNIQUE KEY `pan_number_4` (`pan_number`),
  UNIQUE KEY `aadhar_number_4` (`aadhar_number`),
  UNIQUE KEY `login_id_4` (`login_id`),
  KEY `referred_by` (`referred_by`),
  KEY `current_slab_id` (`current_slab_id`),
  CONSTRAINT `users_ibfk_33` FOREIGN KEY (`referred_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `users_ibfk_34` FOREIGN KEY (`current_slab_id`) REFERENCES `slabs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=90 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (1, 'Super Admin', 'admin@devojasrealtors.in', '9999999999', '$2a$10$maOB.on1DZv/7LN36wGPZu69GsIZglJ5EoSGRD5n.Xs9ZkL6Q0XJu', 'admin', NULL, 'approved', NULL, 'active', 'ADMIN001', '2026-08-16 06:10:51', '2026-10-19 05:45:44', NULL, NULL, 30, '0.00', NULL, '2026-10-19 05:45:44', 'DEV-0001', NULL, NULL, NULL, NULL, 5, '', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (2, 'Ajay Rai', 'client@realestate.com', '09876543210', '$2a$10$dsQwZ0F90367jwnRQved2O1YXzox.eB90RZlJ8W6UlTbJaq3t0Rp2', 'associate', 1, 'not_submitted', NULL, 'active', 'AJAQBA944', '2026-08-17 05:57:04', '2026-10-16 08:48:22', NULL, NULL, 29, '0.00', NULL, '2026-10-16 08:48:22', 'DEV-0002', NULL, NULL, NULL, NULL, 5, '', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (4, 'Mayank', 'associate@realestate.com', '8765432598', '$2a$10$Wj8Rv.GjAilxIEyrhlKqxus2Illw.ofE4/FBYL9h03OgQ0FP5w5Mu', 'associate', 23, 'not_submitted', NULL, 'active', 'MAYZG1VQB', '2026-08-17 06:02:03', '2026-10-16 08:48:22', NULL, NULL, 27, '0.00', NULL, '2026-10-16 08:48:22', 'DEV-0004', NULL, NULL, NULL, NULL, 5, '', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (5, 'Yash Maurya', 'account@realestate.com', '9506265038', '$2a$10$dsQwZ0F90367jwnRQved2O1YXzox.eB90RZlJ8W6UlTbJaq3t0Rp2', 'accounts', 4, 'not_submitted', NULL, 'active', 'YASZBHYFA', '2026-08-17 06:04:41', '2026-10-17 10:51:59', NULL, NULL, 26, '0.00', NULL, '2026-10-17 10:51:59', 'DEV-0005', NULL, NULL, NULL, NULL, 5, '', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (6, 'madhu', 'prajapatimadhumita23@gmail.com', '9506265039', '$2a$10$dsQwZ0F90367jwnRQved2O1YXzox.eB90RZlJ8W6UlTbJaq3t0Rp2', 'associate', 5, 'rejected', '857545738511', 'active', 'MADOPTX31', '2026-09-04 07:47:16', '2026-09-30 09:04:38', NULL, NULL, 25, '0.00', NULL, NULL, 'DEV-0006', NULL, NULL, NULL, NULL, 5, '', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (7, 'madhu', 'patna@gmail.com', '9506265030', '$2a$10$dsQwZ0F90367jwnRQved2O1YXzox.eB90RZlJ8W6UlTbJaq3t0Rp2', 'client', NULL, 'not_submitted', NULL, 'active', 'MADNMZA9L', '2026-09-09 05:17:12', '2026-09-23 17:46:38', '', '', 0, '0.00', NULL, NULL, 'DEV-0007', NULL, NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (8, 'sonam', 'sonam@gmail.com', '8765867810', '$2a$10$dsQwZ0F90367jwnRQved2O1YXzox.eB90RZlJ8W6UlTbJaq3t0Rp2', 'client', NULL, 'not_submitted', NULL, 'active', 'SONIKRMSQ', '2026-09-09 05:30:57', '2026-09-23 17:46:38', NULL, NULL, NULL, '0.00', NULL, NULL, 'DEV-0008', NULL, NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (9, 'saanu', 'saanu@gmail.com', '9876456789', '$2a$10$dsQwZ0F90367jwnRQved2O1YXzox.eB90RZlJ8W6UlTbJaq3t0Rp2', 'client', NULL, 'not_submitted', NULL, 'active', 'SAA60156N', '2026-09-09 05:55:03', '2026-09-23 17:46:38', NULL, NULL, NULL, '0.00', NULL, NULL, 'DEV-0009', NULL, NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (10, 'vishal', NULL, '9682546496', '$2a$10$Wj8Rv.GjAilxIEyrhlKqxus2Illw.ofE4/FBYL9h03OgQ0FP5w5Mu', 'associate', NULL, 'not_submitted', NULL, 'active', 'VISJI62N6', '2026-09-22 05:19:23', '2026-09-23 17:46:26', NULL, NULL, 5, '0.00', NULL, '2026-09-22 05:19:40', 'DEV-0010', NULL, NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (11, 'Pooja Sharma', 'pooja@gmail.com', '9876543210', '$2a$10$Wj8Rv.GjAilxIEyrhlKqxus2Illw.ofE4/FBYL9h03OgQ0FP5w5Mu', 'associate', NULL, 'not_submitted', NULL, 'active', 'POOJA987', '2026-09-22 06:15:09', '2026-09-23 17:46:26', NULL, NULL, 7, '0.00', NULL, NULL, 'DEV-0011', NULL, NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (12, 'Arun Kumar Suryavanshi', 'arun.surya@gmail.com', '8299649457', '$2a$10$dsQwZ0F90367jwnRQved2O1YXzox.eB90RZlJ8W6UlTbJaq3t0Rp2', 'client', 11, 'not_submitted', NULL, 'active', 'ARUN8299', '2026-09-22 06:15:09', '2026-09-23 17:46:38', NULL, NULL, NULL, '0.00', NULL, NULL, 'DEV-0012', NULL, NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (13, 'madhu', NULL, '8933006032', '$2a$10$Wj8Rv.GjAilxIEyrhlKqxus2Illw.ofE4/FBYL9h03OgQ0FP5w5Mu', 'associate', NULL, 'not_submitted', NULL, 'active', 'MAD7KCWSK', '2026-09-22 07:54:16', '2026-09-23 17:46:26', NULL, NULL, 5, '0.00', NULL, '2026-09-22 07:54:28', 'DEV-0013', NULL, NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (14, 'madhu Prajapati', 'vishal@gmail.com', '9876543789', '$2a$10$Wj8Rv.GjAilxIEyrhlKqxus2Illw.ofE4/FBYL9h03OgQ0FP5w5Mu', 'associate', NULL, 'rejected', NULL, 'active', 'MADMTDHXK', '2026-09-23 15:01:14', '2026-09-28 15:39:02', 'ABCDE1234F', '857545738511', 5, '0.00', NULL, NULL, 'DEV-0014', 'MAA BHAWANI NAGAR COLONY', NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (15, 'vishal', 'vishal1@gmail.com', '8932983035', '$2a$10$Wj8Rv.GjAilxIEyrhlKqxus2Illw.ofE4/FBYL9h03OgQ0FP5w5Mu', 'associate', NULL, 'pending', NULL, 'active', 'VIS148CMK', '2026-09-23 15:10:49', '2026-09-23 17:46:26', 'GDBSE1234F', '768965789277', 5, '0.00', NULL, '2026-09-23 15:27:54', 'DEV-0015', 'azamgarh', NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (16, 'madhu Prajapati', 'madhup@gmail.com', '9876545610', '$2a$10$Wj8Rv.GjAilxIEyrhlKqxus2Illw.ofE4/FBYL9h03OgQ0FP5w5Mu', 'associate', NULL, 'pending', NULL, 'active', 'MADP0IK7K', '2026-09-23 15:29:55', '2026-09-28 15:38:25', 'ABCHE4567F', '678943567822', 8, '0.00', NULL, '2026-09-23 15:30:33', 'DEV-0016', 'amadhi', NULL, NULL, NULL, 8, 'system', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (17, 'vickky', 'vickky@gmail.com', '9682466937', '$2a$10$Wj8Rv.GjAilxIEyrhlKqxus2Illw.ofE4/FBYL9h03OgQ0FP5w5Mu', 'associate', NULL, 'pending', NULL, 'active', 'VICN540OG', '2026-09-23 17:32:50', '2026-09-23 17:46:26', 'HJKRD1237K', '859845738511', 5, '0.00', NULL, '2026-09-23 17:43:42', 'DEV-0017', 'maa bhawani nagar colony', NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (22, 'Ravindra prajapati', 'anshika@gmail.com', '9876573210', '$2a$10$BnQtIoG6Z9rb96y6iQ9gxu7HzXLnm.zMa3jE7IFFscci0vJWmXKSO', 'associate', NULL, 'not_submitted', NULL, 'active', 'RAVYCIG0L', '2026-09-28 15:14:34', '2026-09-28 15:38:35', 'ABCYE1234F', '0018', 9, '0.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 9, 'system', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (23, 'Head 3', 'head3@devojas.com', '9999000003', '$2a$10$KDP49uQd6dCGDAYXg2LHiuqveam9qWgT.2MJaW6u9Lir9xRg/zAt6', 'associate', 2, 'approved', NULL, 'active', 'HEAD003', '2026-09-30 09:04:38', '2026-09-30 09:04:38', NULL, NULL, 28, '0.00', NULL, NULL, 'DEV-0003', NULL, NULL, NULL, NULL, 5, '', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (24, 'Priya Singh', 'priya.singh@gmail.com', '9876543211', '$2a$10$BGNhz19rGe2vQPr.nwg/DeHMu8Jn4z2UyKWyntdNPIvuOmaI9NHSi', 'associate', 11, 'approved', NULL, 'active', 'PRIYAS529', '2026-10-01 09:48:03', '2026-10-01 09:48:03', 'BCDES2345B', '234567890123', 4, '0.00', NULL, '2026-09-27 22:01:16', 'DEV-0024', 'C-45, Orderly Bazar, Varanasi - 221002', NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (25, 'Rahul Gupta', 'rahul.gupta@gmail.com', '9876543212', '$2a$10$V/f9TFbmH4W.PW1eEVaTcuNQWRHuqRFVdcmYJNVvbmcfhLOcz2SqS', 'associate', 24, 'approved', NULL, 'active', 'RAHULG943', '2026-10-01 09:48:03', '2026-10-01 09:48:03', 'CDEFG3456C', '345678901234', 3, '0.00', NULL, '2026-09-28 20:34:57', 'DEV-0025', 'A-7, Assi Ghat Road, Varanasi - 221005', NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (26, 'Sunita Devi', 'sunita.devi@gmail.com', '9876543213', '$2a$10$1BrjkXdRqzxVtUHktho/tee5pgzHDW.jeZ9/cjIg/G1jq8hh5sG0W', 'associate', 24, 'approved', NULL, 'active', 'SUNITA282', '2026-10-01 09:48:03', '2026-10-01 09:48:03', 'DEFGH4567D', '456789012345', 3, '0.00', NULL, '2026-09-26 09:19:04', 'DEV-0026', 'D-22, Bhelupur, Varanasi - 221010', NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (27, 'Vikram Yadav', 'vikram.yadav@gmail.com', '9876543214', '$2a$10$5Nz3ZlSgkrhVcpIbfJgeLuUYZjYfTLUN/X1IgbjuR9PiysUO1/AP2', 'associate', 11, 'approved', NULL, 'active', 'VIKRAM664', '2026-10-01 09:48:03', '2026-10-01 09:48:03', 'EFGHI5678E', '567890123456', 4, '0.00', NULL, '2026-09-28 04:03:34', 'DEV-0027', 'F-33, Nadesar, Varanasi - 221002', NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (28, 'Neeta Mishra', 'neeta.mishra@gmail.com', '9876543215', '$2a$10$G/Xe4xJRyyqK2oqADk9Zgee5fs9axu2CLcpAcWaXHaboszQc5rIwC', 'associate', 27, 'approved', NULL, 'active', 'NEETAM731', '2026-10-01 09:48:04', '2026-10-01 09:48:04', 'FGHIJ6789F', '678901234567', 3, '0.00', NULL, '2026-09-29 10:13:48', 'DEV-0028', 'G-15, Kashi Vidyapeeth Road, Varanasi - 221002', NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (29, 'Fixed Associate 1', 'associate1@devojas.com', '9999001001', '$2a$10$TB/tZ91g5dj/1nc74dx3B.Uf5bIBVU48fM1Af/65p2nF9.sqCv72e', 'associate', NULL, 'approved', NULL, 'active', 'FIXED1456', '2026-10-01 09:48:04', '2026-10-19 05:42:47', NULL, NULL, NULL, '0.00', NULL, NULL, 'devojas-0001', NULL, NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 1, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (30, 'Fixed Associate 2', 'associate2@devojas.com', '9999001002', '$2a$10$xuCdzhZgIZn4rm.MZl0twOJtNSEw0S08FFHpo2QDVg9VyuDKd86Eu', 'associate', NULL, 'approved', NULL, 'active', 'FIXED2523', '2026-10-01 09:48:04', '2026-10-01 09:48:04', NULL, NULL, NULL, '0.00', NULL, NULL, 'devojas-0002', NULL, NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 1, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (31, 'Fixed Associate 3', 'associate3@devojas.com', '9999001003', '$2a$10$bl590dbHfi7VW3DpobBK.ecj3o64/05JFvX3Fzq84OlBBA7zW0CFu', 'associate', NULL, 'approved', NULL, 'active', 'FIXED3874', '2026-10-01 09:48:04', '2026-10-01 09:48:04', NULL, NULL, NULL, '0.00', NULL, NULL, 'devojas-0003', NULL, NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 1, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (32, 'Fixed Associate 4', 'associate4@devojas.com', '9999001004', '$2a$10$j9biQeFcegTBKUpMMo1ZX.xIrjR1iAYAQ7kH6Y8z5FtTyjgbhb0Lq', 'associate', NULL, 'approved', NULL, 'active', 'FIXED4585', '2026-10-01 09:48:04', '2026-10-01 09:48:04', NULL, NULL, NULL, '0.00', NULL, NULL, 'devojas-0004', NULL, NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 1, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (33, 'Fixed Associate 5', 'associate5@devojas.com', '9999001005', '$2a$10$D5LypW6w4xsVbQH2AoSHFO9kKJX3E9blrez4LkEQKVbzuQsvX9uBC', 'associate', NULL, 'approved', NULL, 'active', 'FIXED5891', '2026-10-01 09:48:04', '2026-10-01 09:48:04', NULL, NULL, NULL, '0.00', NULL, NULL, 'devojas-0005', NULL, NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 1, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (34, 'Fixed Associate 6', 'associate6@devojas.com', '9999001006', '$2a$10$E1IuTJCJWWwPiqN8DGrpY.HC6FnYBMjs.stQc6408cOM1H28ocKiO', 'associate', NULL, 'approved', NULL, 'active', 'FIXED6240', '2026-10-01 09:48:04', '2026-10-01 09:48:04', NULL, NULL, NULL, '0.00', NULL, NULL, 'devojas-0006', NULL, NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 1, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (35, 'Deepak Agarwal', 'deepak.ag@gmail.com', '9800000001', '$2a$10$hvvyaP00QG2iWwHY4gLaFuXfztWD48yCAtUNSxlFMc3TzMZ03aBbW', 'client', NULL, 'not_submitted', NULL, 'active', 'DEEPAK695', '2026-10-01 09:48:04', '2026-10-01 09:48:04', NULL, NULL, NULL, '0.00', NULL, NULL, 'DEV-0035', 'H-55, Mahmoorganj, Varanasi', NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (36, 'Kavita Verma', 'kavita.v@gmail.com', '9800000002', '$2a$10$daExK2a1TaWK1m/X5d18Bunw9Wm5hNx7FkyOv2M5SN623JUNBa4.q', 'client', NULL, 'not_submitted', NULL, 'active', 'KAVITA831', '2026-10-01 09:48:04', '2026-10-01 09:48:04', NULL, NULL, NULL, '0.00', NULL, NULL, 'DEV-0036', 'J-19, Shivpur, Varanasi', NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (37, 'Suresh Tiwari', NULL, '9800000003', '$2a$10$jkwk4E.FUsllzuIBmp6SceSJ8wUz.8uzMpex/S.2tJ.9gzyELV9O.', 'client', NULL, 'not_submitted', NULL, 'active', 'SURESH386', '2026-10-01 09:48:04', '2026-10-01 09:48:04', NULL, NULL, NULL, '0.00', NULL, NULL, 'DEV-0037', 'K-8, Rohania, Varanasi', NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (38, 'Finance & Accounts Officer', 'accounts@devojasrealtors.in', '9999000002', '$2a$10$rkGPy2ZSvXZtaa2BXFvvDOGql5n4zCPNiQo21YaLZsde2noKcmmUy', 'accounts', NULL, 'approved', NULL, 'active', NULL, '2026-10-16 07:48:53', '2026-10-16 07:48:53', NULL, NULL, NULL, '0.00', NULL, NULL, 'DEV-ACCOUNTS', NULL, NULL, NULL, NULL, 0, 'system', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (39, 'Vikram Seth (Demo Buyer)', 'client.vikram@demo.com', '9888000099', '$2a$10$rkGPy2ZSvXZtaa2BXFvvDOGql5n4zCPNiQo21YaLZsde2noKcmmUy', 'client', NULL, 'approved', NULL, 'active', NULL, '2026-10-16 07:48:53', '2026-10-16 07:48:53', NULL, NULL, NULL, '0.00', NULL, NULL, 'CLIENT-001', NULL, NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (40, 'Devojas Property Holdings (Demo Seller)', 'holdings@demo.com', '9888000098', '$2a$10$rkGPy2ZSvXZtaa2BXFvvDOGql5n4zCPNiQo21YaLZsde2noKcmmUy', 'client', NULL, 'approved', NULL, 'active', NULL, '2026-10-16 07:48:53', '2026-10-16 07:48:53', NULL, NULL, NULL, '0.00', NULL, NULL, 'SELLER-001', NULL, NULL, NULL, NULL, 5, 'system', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (41, 'Associate A (Main Leader)', 'associate.a@demo.com', '9888000001', '$2a$10$rkGPy2ZSvXZtaa2BXFvvDOGql5n4zCPNiQo21YaLZsde2noKcmmUy', 'associate', NULL, 'approved', NULL, 'active', 'LEADER10', '2026-10-16 07:48:53', '2026-10-16 07:48:53', NULL, NULL, NULL, '0.00', NULL, NULL, 'DEMO-001', NULL, NULL, NULL, NULL, 10, 'admin', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (42, 'Associate B (Senior Partner)', 'associate.b@demo.com', '9888000002', '$2a$10$rkGPy2ZSvXZtaa2BXFvvDOGql5n4zCPNiQo21YaLZsde2noKcmmUy', 'associate', 41, 'approved', NULL, 'active', 'PARTNER7', '2026-10-16 07:48:53', '2026-10-16 07:48:53', NULL, NULL, NULL, '0.00', NULL, NULL, 'DEMO-002', NULL, NULL, NULL, NULL, 7, 'admin', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (43, 'Associate C (Direct Partner)', 'associate.c@demo.com', '9888000003', '$2a$10$rkGPy2ZSvXZtaa2BXFvvDOGql5n4zCPNiQo21YaLZsde2noKcmmUy', 'associate', 41, 'approved', NULL, 'active', 'PARTNER4', '2026-10-16 07:48:53', '2026-10-16 07:49:39', NULL, NULL, NULL, '2000000.00', 2, NULL, 'DEMO-003', NULL, NULL, NULL, NULL, 4, 'admin', '2000000.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (44, 'Associate D (Direct Partner)', 'associate.d@demo.com', '9888000004', '$2a$10$rkGPy2ZSvXZtaa2BXFvvDOGql5n4zCPNiQo21YaLZsde2noKcmmUy', 'associate', 41, 'approved', NULL, 'active', 'PARTNER5', '2026-10-16 07:48:53', '2026-10-16 07:48:53', NULL, NULL, NULL, '0.00', NULL, NULL, 'DEMO-004', NULL, NULL, NULL, NULL, 5, 'admin', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (45, 'Associate E (Team Member)', 'associate.e@demo.com', '9888000005', '$2a$10$rkGPy2ZSvXZtaa2BXFvvDOGql5n4zCPNiQo21YaLZsde2noKcmmUy', 'associate', 42, 'approved', NULL, 'active', 'MEMBER4', '2026-10-16 07:48:53', '2026-10-16 07:48:53', NULL, NULL, NULL, '0.00', NULL, NULL, 'DEMO-005', NULL, NULL, NULL, NULL, 4, 'admin', '0.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (46, 'Associate G (Field Executive)', 'associate.g@demo.com', '9888000006', '$2a$10$rkGPy2ZSvXZtaa2BXFvvDOGql5n4zCPNiQo21YaLZsde2noKcmmUy', 'associate', 45, 'approved', NULL, 'active', 'FIELD2', '2026-10-16 07:48:53', '2026-10-16 07:49:39', NULL, NULL, NULL, '1000000.00', 2, NULL, 'DEMO-006', NULL, NULL, NULL, NULL, 2, 'admin', '1000000.00', NULL, NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (83, 'Ram', 'test.ram@devojasrealtors.in', '9700000001', '$2a$10$fojGep42uBQgXgqPi0KkpuFKTh19ajn8Afm7jpJja.MyCOBYBtZS6', 'associate', NULL, 'approved', NULL, 'active', 'TEST-RAM-001', '2026-10-17 12:00:18', '2026-10-17 12:00:18', 'RAMTEST1001', '970000000001', 10, '0.00', NULL, NULL, 'TEST-RAM-001', NULL, NULL, NULL, NULL, 10, 'admin', '0.00', 'Test@1234', NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (84, 'Person A', 'test.persona@devojasrealtors.in', '9700000002', '$2a$10$fojGep42uBQgXgqPi0KkpuFKTh19ajn8Afm7jpJja.MyCOBYBtZS6', 'associate', 83, 'approved', NULL, 'active', 'TEST-A-002', '2026-10-17 12:00:18', '2026-10-17 12:00:18', 'PERSNA1002', '970000000002', 7, '0.00', NULL, NULL, 'TEST-A-002', NULL, NULL, NULL, NULL, 7, 'admin', '0.00', 'Test@1234', NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (85, 'Person B', 'test.personb@devojasrealtors.in', '9700000003', '$2a$10$fojGep42uBQgXgqPi0KkpuFKTh19ajn8Afm7jpJja.MyCOBYBtZS6', 'associate', 83, 'approved', NULL, 'active', 'TEST-B-003', '2026-10-17 12:00:18', '2026-10-17 12:00:18', 'PERSNB1003', '970000000003', 4, '0.00', NULL, NULL, 'TEST-B-003', NULL, NULL, NULL, NULL, 4, 'admin', '0.00', 'Test@1234', NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (86, 'Person C', 'test.personc@devojasrealtors.in', '9700000004', '$2a$10$fojGep42uBQgXgqPi0KkpuFKTh19ajn8Afm7jpJja.MyCOBYBtZS6', 'associate', 83, 'approved', NULL, 'active', 'TEST-C-004', '2026-10-17 12:00:18', '2026-10-17 12:00:18', 'PERSNC1004', '970000000004', 6, '0.00', NULL, NULL, 'TEST-C-004', NULL, NULL, NULL, NULL, 6, 'admin', '0.00', 'Test@1234', NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (87, 'Person D', 'test.persond@devojasrealtors.in', '9700000005', '$2a$10$fojGep42uBQgXgqPi0KkpuFKTh19ajn8Afm7jpJja.MyCOBYBtZS6', 'associate', 84, 'approved', NULL, 'active', 'TEST-D-005', '2026-10-17 12:00:18', '2026-10-17 12:00:40', 'PERSND1005', '970000000005', 5, '4000000.00', 3, NULL, 'TEST-D-005', NULL, NULL, NULL, NULL, 5, 'admin', '4000000.00', 'Test@1234', NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (88, 'Person E', 'test.persone@devojasrealtors.in', '9700000006', '$2a$10$fojGep42uBQgXgqPi0KkpuFKTh19ajn8Afm7jpJja.MyCOBYBtZS6', 'associate', 84, 'approved', NULL, 'active', 'TEST-E-006', '2026-10-17 12:00:18', '2026-10-17 12:00:18', 'PERSNE1006', '970000000006', 4, '0.00', NULL, NULL, 'TEST-E-006', NULL, NULL, NULL, NULL, 4, 'admin', '0.00', 'Test@1234', NULL, 0, 0, NULL, NULL, NULL);
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `referred_by`, `kyc_status`, `kyc_document_url`, `status`, `referral_code`, `created_at`, `updated_at`, `pan_number`, `aadhar_number`, `referral_commission_percent`, `total_business_volume`, `current_slab_id`, `last_login_at`, `login_id`, `address`, `approved_by`, `approved_at`, `rejection_reason`, `commission_percent`, `commission_set_by`, `self_business_volume`, `plain_password`, `profile_image`, `is_fixed_associate`, `is_temporary_password`, `temporary_password_expires_at`, `last_sms_sent_at`, `last_sms_status`) VALUES (89, 'Demo Client', 'demo-client@example.com', '9700000050', '$2a$10$fojGep42uBQgXgqPi0KkpuFKTh19ajn8Afm7jpJja.MyCOBYBtZS6', 'client', 87, 'approved', NULL, 'active', NULL, '2026-10-17 12:00:18', '2026-10-17 12:00:18', NULL, NULL, NULL, '0.00', NULL, NULL, 'TEST-CLIENT-001', 'TEST ADDRESS, Sector 02, Test City', NULL, NULL, NULL, 0, 'system', '0.00', 'Test@1234', NULL, 0, 0, NULL, NULL, NULL);

DROP TABLE IF EXISTS `wallet_transactions`;
CREATE TABLE `wallet_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `type` enum('credit','debit','withdrawal_request','withdrawal_approved','withdrawal_rejected') NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` enum('pending','completed','rejected') DEFAULT 'completed',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `wallet_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `wallet_transactions` (`id`, `user_id`, `type`, `amount`, `description`, `status`, `created_at`, `updated_at`) VALUES (1, 46, 'credit', '20000.00', 'Direct Commission (2%) - Deal #3', 'completed', '2026-10-16 07:49:39', '2026-10-16 07:49:39');
INSERT INTO `wallet_transactions` (`id`, `user_id`, `type`, `amount`, `description`, `status`, `created_at`, `updated_at`) VALUES (2, 46, 'credit', '25000.00', 'Milestone reward - reached Slab 2 Self Target', 'completed', '2026-10-16 07:49:39', '2026-10-16 07:49:39');
INSERT INTO `wallet_transactions` (`id`, `user_id`, `type`, `amount`, `description`, `status`, `created_at`, `updated_at`) VALUES (3, 45, 'credit', '20000.00', 'Override differential (2%) from Associate G (Field Executive)\'s deal - Deal #3', 'completed', '2026-10-16 07:49:39', '2026-10-16 07:49:39');
INSERT INTO `wallet_transactions` (`id`, `user_id`, `type`, `amount`, `description`, `status`, `created_at`, `updated_at`) VALUES (4, 42, 'credit', '30000.00', 'Override differential (3%) from Associate G (Field Executive)\'s deal - Deal #3', 'completed', '2026-10-16 07:49:39', '2026-10-16 07:49:39');
INSERT INTO `wallet_transactions` (`id`, `user_id`, `type`, `amount`, `description`, `status`, `created_at`, `updated_at`) VALUES (5, 41, 'credit', '30000.00', 'Override differential (3%) from Associate G (Field Executive)\'s deal - Deal #3', 'completed', '2026-10-16 07:49:39', '2026-10-16 07:49:39');
INSERT INTO `wallet_transactions` (`id`, `user_id`, `type`, `amount`, `description`, `status`, `created_at`, `updated_at`) VALUES (6, 43, 'credit', '80000.00', 'Direct Commission (4%) - Deal #4', 'completed', '2026-10-16 07:49:39', '2026-10-16 07:49:39');
INSERT INTO `wallet_transactions` (`id`, `user_id`, `type`, `amount`, `description`, `status`, `created_at`, `updated_at`) VALUES (7, 43, 'credit', '25000.00', 'Milestone reward - reached Slab 2 Self Target', 'completed', '2026-10-16 07:49:39', '2026-10-16 07:49:39');
INSERT INTO `wallet_transactions` (`id`, `user_id`, `type`, `amount`, `description`, `status`, `created_at`, `updated_at`) VALUES (8, 41, 'credit', '120000.00', 'Override differential (6%) from Associate C (Direct Partner)\'s deal - Deal #4', 'completed', '2026-10-16 07:49:39', '2026-10-16 07:49:39');
INSERT INTO `wallet_transactions` (`id`, `user_id`, `type`, `amount`, `description`, `status`, `created_at`, `updated_at`) VALUES (16, 87, 'credit', '25000.00', 'Milestone reward - reached Slab 2 Self Target', 'completed', '2026-10-17 12:00:18', '2026-10-17 12:00:18');
INSERT INTO `wallet_transactions` (`id`, `user_id`, `type`, `amount`, `description`, `status`, `created_at`, `updated_at`) VALUES (17, 87, 'credit', '50000.00', 'Milestone reward - reached Slab 3 Self Target', 'completed', '2026-10-17 12:00:40', '2026-10-17 12:00:40');

DROP TABLE IF EXISTS `wallets`;
CREATE TABLE `wallets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `balance` decimal(15,2) DEFAULT 0.00,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `wallets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=82 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (1, 1, '0.00', '2026-08-16 06:10:51', '2026-08-16 06:10:51');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (2, 2, '0.00', '2026-08-17 05:57:04', '2026-08-17 05:57:04');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (3, 4, '0.00', '2026-08-17 06:02:03', '2026-08-17 06:02:03');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (4, 5, '0.00', '2026-08-17 06:04:41', '2026-08-17 06:04:41');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (5, 6, '0.00', '2026-09-04 07:47:16', '2026-09-04 07:47:16');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (6, 7, '0.00', '2026-09-09 05:17:12', '2026-09-09 05:17:12');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (7, 8, '0.00', '2026-09-09 05:30:57', '2026-09-09 05:30:57');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (8, 9, '0.00', '2026-09-09 05:55:03', '2026-09-09 05:55:03');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (9, 10, '0.00', '2026-09-22 05:19:23', '2026-09-22 05:19:23');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (10, 11, '15000.00', '2026-09-22 06:15:09', '2026-09-22 06:15:09');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (11, 12, '0.00', '2026-09-22 06:15:09', '2026-09-22 06:15:09');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (12, 13, '0.00', '2026-09-22 07:54:16', '2026-09-22 07:54:16');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (13, 14, '0.00', '2026-09-23 15:01:14', '2026-09-23 15:01:14');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (14, 15, '0.00', '2026-09-23 15:10:49', '2026-09-23 15:10:49');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (15, 16, '0.00', '2026-09-23 15:29:55', '2026-09-23 15:29:55');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (16, 17, '0.00', '2026-09-23 17:32:50', '2026-09-23 17:32:50');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (18, 22, '0.00', '2026-09-28 15:14:34', '2026-09-28 15:14:34');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (19, 24, '35157.00', '2026-10-01 09:48:03', '2026-10-01 09:48:03');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (20, 25, '21816.00', '2026-10-01 09:48:03', '2026-10-01 09:48:03');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (21, 26, '10085.00', '2026-10-01 09:48:03', '2026-10-01 09:48:03');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (22, 27, '6258.00', '2026-10-01 09:48:03', '2026-10-01 09:48:03');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (23, 28, '12580.00', '2026-10-01 09:48:04', '2026-10-01 09:48:04');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (24, 29, '0.00', '2026-10-01 09:48:04', '2026-10-01 09:48:04');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (25, 30, '0.00', '2026-10-01 09:48:04', '2026-10-01 09:48:04');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (26, 31, '0.00', '2026-10-01 09:48:04', '2026-10-01 09:48:04');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (27, 32, '0.00', '2026-10-01 09:48:04', '2026-10-01 09:48:04');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (28, 33, '0.00', '2026-10-01 09:48:04', '2026-10-01 09:48:04');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (29, 34, '0.00', '2026-10-01 09:48:04', '2026-10-01 09:48:04');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (30, 35, '0.00', '2026-10-01 09:48:04', '2026-10-01 09:48:04');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (31, 36, '0.00', '2026-10-01 09:48:04', '2026-10-01 09:48:04');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (32, 37, '0.00', '2026-10-01 09:48:04', '2026-10-01 09:48:04');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (33, 38, '0.00', '2026-10-16 07:48:53', '2026-10-16 07:48:53');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (34, 41, '150000.00', '2026-10-16 07:48:53', '2026-10-16 07:49:39');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (35, 42, '30000.00', '2026-10-16 07:48:53', '2026-10-16 07:49:39');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (36, 43, '105000.00', '2026-10-16 07:48:53', '2026-10-16 07:49:39');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (37, 44, '0.00', '2026-10-16 07:48:53', '2026-10-16 07:48:53');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (38, 45, '20000.00', '2026-10-16 07:48:53', '2026-10-16 07:49:39');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (39, 46, '45000.00', '2026-10-16 07:48:53', '2026-10-16 07:49:39');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (75, 83, '0.00', '2026-10-17 12:00:18', '2026-10-17 12:00:18');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (76, 84, '0.00', '2026-10-17 12:00:18', '2026-10-17 12:00:18');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (77, 85, '0.00', '2026-10-17 12:00:18', '2026-10-17 12:00:18');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (78, 86, '0.00', '2026-10-17 12:00:18', '2026-10-17 12:00:18');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (79, 87, '75000.00', '2026-10-17 12:00:18', '2026-10-17 12:00:40');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (80, 88, '0.00', '2026-10-17 12:00:18', '2026-10-17 12:00:18');
INSERT INTO `wallets` (`id`, `user_id`, `balance`, `created_at`, `updated_at`) VALUES (81, 89, '0.00', '2026-10-17 12:00:18', '2026-10-17 12:00:18');

SET FOREIGN_KEY_CHECKS=1;
