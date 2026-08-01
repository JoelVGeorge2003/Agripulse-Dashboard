INSERT INTO "Commodity" ("id","slug","name","symbol","category","defaultUnit","color","description","featured","displayOrder","createdAt","updatedAt") VALUES
('county-oats','oats','Oats','OATS','GRAIN','USD / bushel','#c5a35c','USDA oats production indicators.',false,16,NOW(),NOW()),
('county-rye','rye','Rye','RYE','GRAIN','USD / bushel','#9a8d52','USDA rye production indicators.',false,17,NOW(),NOW()),
('county-canola','canola','Canola','CANOLA','OILSEED','USD / pound','#d4b832','USDA canola production indicators.',false,18,NOW(),NOW()),
('county-sunflower','sunflower','Sunflower','SUNFLOWER','OILSEED','USD / pound','#d69e2e','USDA sunflower production indicators.',false,19,NOW(),NOW()),
('county-dry-beans','dry-beans','Dry Edible Beans','DRYBEANS','SPECIALTY','USD / cwt','#996b4a','USDA dry edible bean production indicators.',false,20,NOW(),NOW()),
('county-potatoes','potatoes','Potatoes','POTATOES','SPECIALTY','USD / cwt','#a98258','USDA potato production indicators.',false,21,NOW(),NOW()),
('county-sugarbeets','sugarbeets','Sugar Beets','SUGARBEETS','SPECIALTY','USD / ton','#b35f78','USDA sugar beet production indicators.',false,22,NOW(),NOW()),
('county-hay','hay','Hay','HAY','SPECIALTY','USD / ton','#7fa15a','USDA hay production indicators.',false,23,NOW(),NOW()),
('county-proso-millet','proso-millet','Proso Millet','MILLET','GRAIN','USD / bushel','#b79b69','USDA proso millet production indicators.',false,24,NOW(),NOW()),
('county-flaxseed','flaxseed','Flaxseed','FLAXSEED','OILSEED','USD / bushel','#6f86ad','USDA flaxseed production indicators.',false,25,NOW(),NOW())
ON CONFLICT ("slug") DO UPDATE SET "name"=EXCLUDED."name", "symbol"=EXCLUDED."symbol", "category"=EXCLUDED."category", "defaultUnit"=EXCLUDED."defaultUnit", "color"=EXCLUDED."color", "description"=EXCLUDED."description", "displayOrder"=EXCLUDED."displayOrder", "updatedAt"=NOW();
