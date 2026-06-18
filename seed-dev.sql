-- Dev-only seed for /discover. Safe to re-run (DELETEs first). Local D1 only.
DELETE FROM flower WHERE growerId LIKE 'seed_%';
DELETE FROM profile WHERE userId LIKE 'seed_%';
DELETE FROM user WHERE id LIKE 'seed_%';

INSERT INTO user (id, name, email, emailVerified, image, createdAt, updatedAt) VALUES
 ('seed_1','Rosa Bloom','rosa@example.com',1,NULL,'2026-01-10T09:00:00Z','2026-06-18T09:00:00Z'),
 ('seed_2','Tom Field','tom@example.com',1,NULL,'2026-02-01T09:00:00Z','2026-06-17T09:00:00Z'),
 ('seed_3','Mara Wilde','mara@example.com',1,NULL,'2026-03-01T09:00:00Z','2026-06-15T09:00:00Z'),
 ('seed_4','Joss Petal','joss@example.com',1,NULL,'2026-03-20T09:00:00Z','2026-06-10T09:00:00Z'),
 ('seed_5','Nell Hart','nell@example.com',1,NULL,'2026-04-05T09:00:00Z','2026-05-28T09:00:00Z'),
 ('seed_6','Ivy Marsh','ivy@example.com',1,NULL,'2026-04-22T09:00:00Z','2026-05-12T09:00:00Z');

-- timestamps in ms. ~ 2026-06: base values, decreasing = "longer ago".
INSERT INTO profile (userId, handle, farmName, locationName, instagram, avatarKey, isGrower, createdAt, updatedAt) VALUES
 ('seed_1','rosebank','Rosebank Flower Farm','Bissoe, Cornwall','rosebankflowers',NULL,1,1736499600000,1781766000000),
 ('seed_2','hilltopblooms','Hilltop Blooms','Totnes, Devon','hilltopblooms',NULL,1,1738400400000,1781679600000),
 ('seed_3','wildmeadow','Wild Meadow Co.','Frome, Somerset',NULL,NULL,1,1740819600000,1781506800000),
 ('seed_4','petalandsprig','Petal & Sprig','Hebden Bridge, West Yorkshire','petalandsprig',NULL,1,1742461200000,1781161200000),
 ('seed_5','harvestlane','Harvest Lane Flowers','Stroud, Gloucestershire',NULL,NULL,1,1743843600000,1779966000000),
 ('seed_6','marshside','Marshside Stems','Aldeburgh, Suffolk','marshsidestems',NULL,1,1745312400000,1778670000000);

-- stemsAvailable: NULL = available (count unspecified), 0 = sold out, >0 = count.
-- stemLengthCm = approx stem length; notes = freeform per-flower note (optional).
INSERT INTO flower (id, growerId, name, variety, color, stemLengthCm, stemsAvailable, notes, sortOrder, isArchived, createdAt, updatedAt) VALUES
 ('seed_f1','seed_1','Cosmos','Cupcake White','White',60,240,'Conditioned overnight — best for weddings. Cut to order.',0,0,1781766000000,1781766000000),
 ('seed_f2','seed_1','Dahlia','Cafe au Lait','Blush',45,30,'Limited this week, message to reserve.',1,0,1781766000000,1781766000000),
 ('seed_f3','seed_1','Sweet Pea',NULL,'Lilac',30,NULL,'Heavenly scent — sold in bunches of 10.',2,0,1781766000000,1781766000000),
 ('seed_f4','seed_1','Ranunculus',NULL,'Coral',35,0,NULL,3,0,1781766000000,1781766000000),
 ('seed_f5','seed_2','Tulip','Apricot Beauty','Apricot',40,180,NULL,0,0,1781679600000,1781679600000),
 ('seed_f6','seed_2','Narcissus',NULL,'Yellow',35,90,NULL,1,0,1781679600000,1781679600000),
 ('seed_f7','seed_2','Anemone','Mistral','Navy',30,60,NULL,2,0,1781679600000,1781679600000),
 ('seed_f8','seed_3','Snapdragon',NULL,'Peach',80,120,NULL,0,0,1781506800000,1781506800000),
 ('seed_f9','seed_3','Scabiosa',NULL,'Burgundy',55,8,'Just a handful left.',1,0,1781506800000,1781506800000),
 ('seed_f10','seed_4','Peony','Sarah Bernhardt','Pink',50,45,'Heads ship in bud — open in 2–3 days.',0,0,1781161200000,1781161200000),
 ('seed_f11','seed_4','Foxglove',NULL,'White',90,70,NULL,1,0,1781161200000,1781161200000),
 ('seed_f12','seed_4','Larkspur',NULL,'Blue',75,110,NULL,2,0,1781161200000,1781161200000),
 ('seed_f13','seed_4','Stock',NULL,'Cream',55,95,NULL,3,0,1781161200000,1781161200000),
 ('seed_f14','seed_4','Nigella',NULL,'Blue',45,200,NULL,4,0,1781161200000,1781161200000),
 ('seed_f15','seed_5','Zinnia','Benarys Giant','Magenta',70,150,NULL,0,0,1779966000000,1779966000000),
 ('seed_f16','seed_5','Rudbeckia',NULL,'Gold',60,130,NULL,1,0,1779966000000,1779966000000);
