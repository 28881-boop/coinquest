CREATE TABLE `missionClaims` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`missionKey` varchar(80) NOT NULL,
	`xpAwarded` int NOT NULL,
	`claimedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `missionClaims_id` PRIMARY KEY(`id`),
	CONSTRAINT `missionClaims_user_mission_unique` UNIQUE(`userId`,`missionKey`)
);
--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileKey` varchar(255) NOT NULL,
	`fileUrl` varchar(500) NOT NULL,
	`mimeType` varchar(80) NOT NULL,
	`status` enum('processing','parsed','needs_review','failed') NOT NULL DEFAULT 'processing',
	`parsedAmount` int,
	`parsedCategory` varchar(80),
	`parsedNote` varchar(255),
	`parsedOccurredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `receipts_id` PRIMARY KEY(`id`)
);
