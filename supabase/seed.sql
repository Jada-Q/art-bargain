-- comparable_sales seed: 15 posters + 15 paintings + 15 photography.
-- Prices and meta calibrated to emerging/mid-career indie art market (USD).
-- Used by the agent's lookupComparableSales tool to anchor offer reasoning.

INSERT INTO comparable_sales (category, meta, sold_price, sold_at, notes) VALUES
-- ===== POSTERS (15) =====
('poster', '{"size":"A4","print_run":500,"signed":false}'::jsonb,                     45.00, '2024-09-12', 'anonymous artist print, mass run /500'),
('poster', '{"size":"A4","print_run":100,"signed":true,"edition_no":42}'::jsonb,      95.00, '2024-11-03', 'signed limited print /100, mid-tier illustrator'),
('poster', '{"size":"A4","print_run":50,"signed":true,"edition_no":18}'::jsonb,      135.00, '2025-02-14', 'small edition signed /50, established illustrator'),
('poster', '{"size":"A3","print_run":300,"signed":false}'::jsonb,                     78.00, '2024-08-20', 'unsigned commercial print A3'),
('poster', '{"size":"A3","print_run":100,"signed":true,"edition_no":67}'::jsonb,     185.00, '2025-01-09', 'signed A3 edition /100, mid-tier'),
('poster', '{"size":"A3","print_run":50,"signed":true,"edition_no":33}'::jsonb,      245.00, '2025-03-22', 'signed A3 small edition /50'),
('poster', '{"size":"A3","print_run":25,"signed":true,"edition_no":12}'::jsonb,      320.00, '2025-05-11', 'tight A3 edition /25, sought-after artist'),
('poster', '{"size":"A2","print_run":50,"signed":true,"edition_no":29}'::jsonb,      285.00, '2024-10-15', 'signed A2 /50, emerging artist'),
('poster', '{"size":"A2","print_run":25,"signed":true,"edition_no":8}'::jsonb,       445.00, '2025-04-02', 'A2 small edition /25, gallery-rep artist'),
('poster', '{"size":"A2","print_run":10,"signed":true,"edition_no":4}'::jsonb,       580.00, '2024-12-08', 'A2 micro edition /10, sold within 2 weeks of release'),
('poster', '{"size":"A4","print_run":200,"signed":true,"edition_no":88}'::jsonb,      72.00, '2024-07-19', 'larger signed run /200, accessible price point'),
('poster', '{"size":"A3","print_run":75,"signed":true,"edition_no":40}'::jsonb,      215.00, '2025-06-30', 'signed A3 /75, recent release sold quickly'),
('poster', '{"size":"A2","print_run":30,"signed":true,"edition_no":21}'::jsonb,      395.00, '2025-08-14', 'A2 signed /30, weekend-only release'),
('poster', '{"size":"A4","print_run":1000,"signed":false}'::jsonb,                    32.00, '2024-06-04', 'open run A4 print, art fair pricing'),
('poster', '{"size":"A2","print_run":40,"signed":true,"edition_no":35}'::jsonb,      360.00, '2025-09-25', 'signed A2 /40, urban art line'),

-- ===== PAINTINGS (15) =====
('painting', '{"medium":"watercolor","width_cm":21,"height_cm":29}'::jsonb,          120.00, '2024-08-15', 'small watercolor on cold press, emerging artist'),
('painting', '{"medium":"watercolor","width_cm":30,"height_cm":40}'::jsonb,          245.00, '2025-01-22', 'mid-size watercolor, framed, indie artist'),
('painting', '{"medium":"acrylic","width_cm":30,"height_cm":30}'::jsonb,             185.00, '2024-11-08', 'small square acrylic, abstract'),
('painting', '{"medium":"acrylic","width_cm":50,"height_cm":70}'::jsonb,             480.00, '2025-03-15', 'medium acrylic landscape, gallery price'),
('painting', '{"medium":"acrylic","width_cm":60,"height_cm":80}'::jsonb,             720.00, '2025-06-04', 'larger acrylic, contemporary style'),
('painting', '{"medium":"oil","width_cm":25,"height_cm":35}'::jsonb,                 380.00, '2024-10-19', 'small oil portrait study, classical training'),
('painting', '{"medium":"oil","width_cm":50,"height_cm":60}'::jsonb,                 890.00, '2025-02-28', 'medium oil still life, mid-career artist'),
('painting', '{"medium":"oil","width_cm":70,"height_cm":90}'::jsonb,                1450.00, '2025-05-17', 'large oil landscape, sought-after collector piece'),
('painting', '{"medium":"oil","width_cm":100,"height_cm":120}'::jsonb,              2100.00, '2024-12-29', 'very large oil, established gallery artist'),
('painting', '{"medium":"mixed_media","width_cm":40,"height_cm":40}'::jsonb,         295.00, '2024-09-30', 'mixed media on canvas, contemporary'),
('painting', '{"medium":"watercolor","width_cm":50,"height_cm":65}'::jsonb,          410.00, '2025-04-11', 'larger watercolor, botanical study'),
('painting', '{"medium":"acrylic","width_cm":80,"height_cm":100}'::jsonb,            920.00, '2025-07-22', 'large acrylic, abstract expressionist'),
('painting', '{"medium":"oil","width_cm":35,"height_cm":45}'::jsonb,                 560.00, '2024-09-08', 'small oil figure study, mid-tier artist'),
('painting', '{"medium":"mixed_media","width_cm":60,"height_cm":80}'::jsonb,         580.00, '2025-08-30', 'larger mixed media, recent gallery show'),
('painting', '{"medium":"watercolor","width_cm":24,"height_cm":32}'::jsonb,          145.00, '2025-10-12', 'small watercolor architectural, urban sketcher'),

-- ===== PHOTOGRAPHY (15) =====
('photography', '{"print_size":"A3","paper":"fiber","edition_size":null}'::jsonb,         95.00, '2024-08-04', 'open edition fiber print A3, street photography'),
('photography', '{"print_size":"A4","paper":"archival_pigment","edition_size":null}'::jsonb, 78.00, '2024-09-20', 'open A4 archival pigment, landscape'),
('photography', '{"print_size":"A3","paper":"archival_pigment","edition_size":100}'::jsonb, 185.00, '2024-11-12', 'signed archival pigment A3 /100'),
('photography', '{"print_size":"A3","paper":"archival_pigment","edition_size":50}'::jsonb,  280.00, '2025-02-08', '/50 archival pigment A3, fine art print'),
('photography', '{"print_size":"A2","paper":"archival_pigment","edition_size":50}'::jsonb,  410.00, '2025-04-17', 'A2 archival /50, mid-tier photographer'),
('photography', '{"print_size":"A3","paper":"silver_gelatin","edition_size":25}'::jsonb,    520.00, '2024-10-30', 'darkroom silver gelatin A3 /25, fine art'),
('photography', '{"print_size":"A2","paper":"silver_gelatin","edition_size":25}'::jsonb,    785.00, '2025-03-25', 'silver gelatin A2 /25, established artist'),
('photography', '{"print_size":"50x75","paper":"fiber","edition_size":10}'::jsonb,         1180.00, '2025-06-15', 'fiber print 50x75 /10, museum quality'),
('photography', '{"print_size":"60x90","paper":"archival_pigment","edition_size":10}'::jsonb, 1450.00, '2024-12-18', '/10 large archival, contemporary photographer'),
('photography', '{"print_size":"A3","paper":"platinum","edition_size":5}'::jsonb,          1850.00, '2025-05-09', 'platinum-palladium /5, alternative process'),
('photography', '{"print_size":"A2","paper":"platinum","edition_size":5}'::jsonb,          2400.00, '2025-09-04', 'platinum /5 A2, top-tier collector piece'),
('photography', '{"print_size":"A4","paper":"fiber","edition_size":null}'::jsonb,            65.00, '2024-07-11', 'open A4 fiber, accessible'),
('photography', '{"print_size":"A4","paper":"archival_pigment","edition_size":75}'::jsonb,  145.00, '2025-01-30', '/75 archival A4, signed'),
('photography', '{"print_size":"A3","paper":"fiber","edition_size":15}'::jsonb,            680.00, '2025-08-22', '/15 fiber A3, urban documentary'),
('photography', '{"print_size":"70x100","paper":"archival_pigment","edition_size":20}'::jsonb, 1320.00, '2025-10-08', '/20 large archival landscape, gallery-rep');
