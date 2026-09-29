-- ============================================================================
-- Migration : champs d'activité manquants + dates par lieu
-- Date      : 2026-09-29
-- À exécuter UNE SEULE FOIS sur la base de production (phpMyAdmin > SQL),
-- AVANT de déployer le code correspondant.
-- Faire une sauvegarde de la base avant (phpMyAdmin > Exporter).
--
-- Uniquement des ajouts de colonnes et des mises à jour de valeurs vides :
-- aucune donnée existante n'est supprimée ni écrasée.
-- ============================================================================

-- 1. Champs du formulaire jusqu'ici perdus à l'enregistrement
ALTER TABLE `activities`
  ADD COLUMN `key_outputs`           TEXT NULL AFTER `total_attendees`,
  ADD COLUMN `means_of_verification` TEXT NULL AFTER `commitments_secured`,
  ADD COLUMN `evidence_available`    TEXT NULL AFTER `means_of_verification`,
  ADD COLUMN `women_leadership`      TEXT NULL AFTER `inclusion_challenges`;

-- 2. Dates propres à chaque lieu
ALTER TABLE `activity_locations`
  ADD COLUMN `date_start` DATETIME(3) NULL AFTER `city_id`,
  ADD COLUMN `date_end`   DATETIME(3) NULL AFTER `date_start`;

-- 3. Reprise : chaque lieu existant reçoit les dates de son activité
--    (c'est ce que l'application affichait déjà pour tous les lieux)
UPDATE `activity_locations` al
  JOIN `activities` a ON a.`id` = al.`activity_id`
   SET al.`date_start` = a.`activity_start_date`,
       al.`date_end`   = a.`activity_end_date`
 WHERE al.`date_start` IS NULL
   AND al.`date_end`   IS NULL;

-- 4. Reprise : total des participants (jamais calculé jusqu'ici)
UPDATE `activities`
   SET `total_attendees` = COALESCE(`male_count`, 0) + COALESCE(`female_count`, 0) + COALESCE(`non_binary_count`, 0)
 WHERE COALESCE(`total_attendees`, 0) = 0;

-- Vérification (doit renvoyer les 6 nouvelles colonnes)
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
  FROM INFORMATION_SCHEMA.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND COLUMN_NAME IN ('key_outputs','means_of_verification','evidence_available','women_leadership','date_start','date_end');
