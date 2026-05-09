import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import {
  seedPhase3Reference,
  seedPhase3ServiceCapacity,
} from './seed-phase3';

config();

/**
 * Staging / UAT Seed Script
 *
 * DESTRUCTIVE — wipes all tables first, then seeds clean UAT data.
 * Scoped to Rayon Pusat only.
 *
 * Policy: ESSENTIALS-ONLY. Staging carries reference data + users + the
 * minimum structural rows the app needs to boot (areas, user_areas,
 * area_staff_requirements, service_capacity grid). It does NOT carry
 * dummy transaction or sample workflow data — UAT testers create their
 * own pruning_requests, area_plants, plant_seeds, etc., mirroring how
 * production starts.
 *
 * Reference data seeded:
 *   - 4   area types       (park, pedestrian, mini_garden, street)
 *   - 3   shift definitions (SHIFT1/2/3)
 *   - 7   rayons            (all Surabaya sectors; only Pusat has areas)
 *   - 20  activity types
 *   - 4   special day overrides
 *   - 5+4 monitoring configs (Phase 2D + Phase 3)
 *   - 128 plant_species     (Phase 3 reference catalog)
 *   - service_capacity grid (7 rayons × 12 ISO weeks × pruning, units=5)
 *
 * UAT structural data seeded (NOT transaction data):
 *   - 13 areas  (1 Taman Bungkul + 12 Kawasan Darmo pedestrian, from KMZ)
 *   - 24 users  (14 test + 10 real, incl. staff_kec_pusat)
 *   - user_areas assignments (permanent)
 *   - user_tracking_status  (all offline — testing starts clean)
 *   - area_staff_requirements (1 satgas + 1 linmas per area, SHIFT1/WEEKDAY)
 *
 * Empty tables (UAT writes its own rows):
 *   - shifts, activities, tasks, overtimes, location_logs, schedules
 *   - area_plants, notable_plants, pruning_requests, plant_seeds, seed_transactions
 *
 * Run: npm run db:seed:staging
 *
 * =============================================================================
 * TEST USERS (all passwords: password123)
 * Login via username OR phone number as "identifier"
 * =============================================================================
 *
 * | Role            | Username                | Phone          | Area/Rayon                             |
 * |-----------------|-------------------------|----------------|----------------------------------------|
 * | superadmin      | superadmin              | 081200000010   | —                                      |
 * | admin_system    | admin_system1           | 081200000011   | —                                      |
 * | top_management  | top_management1         | 081200000012   | —                                      |
 * | kepala_rayon    | kepala_rayon_pusat      | 081200000013   | Rayon Pusat                            |
 * | admin_data      | admin_data_pusat_1      | 081200000014   | Rayon Pusat                            |
 * | korlap          | korlap_pusat_1          | 081200000015   | All 13 areas (Bungkul + 12 pedestrian) |
 * | korlap          | korlap_pusat_2          | 081200000016   | All 13 areas (Bungkul + 12 pedestrian) |
 * | korlap          | korlap_bungkul_1        | 081200000017   | Taman Bungkul only                     |
 * | satgas          | satgas_pusat_1          | 081200000018   | All 13 areas                           |
 * | satgas          | satgas_pusat_2          | 081200000019   | 12 pedestrian only (no Taman Bungkul)  |
 * | linmas          | linmas_pusat_1          | 081200000020   | All 13 areas                           |
 * | linmas          | linmas_pusat_2          | 081200000021   | Taman Bungkul only                     |
 * | satgas          | satgas_bungkul_1        | 081200000022   | Taman Bungkul only                     |
 *
 * REAL USERS (all passwords: password123)
 *
 * | Role            | Username                | Phone          | Area/Rayon                             |
 * |-----------------|-------------------------|----------------|----------------------------------------|
 * | top_management  | pramudita_yustiani      | 08563302643    | —                                      |
 * | superadmin      | wahyu_tri_p             | 081232939377   | —                                      |
 * | kepala_rayon    | budi_setyo_utomo        | 081200000001   | Rayon Pusat                            |
 * | admin_data      | ponco_adi_prabowo       | 081200000002   | Rayon Pusat                            |
 * | satgas          | rakhmat_novianto        | 087825841818   | Jl. Raya Darmo Pulau 1                 |
 * | satgas          | roy_junaidi             | 083854355341   | Jl. Raya Darmo Pulau 2                 |
 * | satgas          | edi_santoso             | 085855434561   | Taman Bungkul                          |
 * | satgas          | jihan_nabila_safitri    | 08970900786    | Taman Bungkul                          |
 * | linmas          | deni_purwanto           | 081554017822   | Taman Bungkul                          |
 * | linmas          | agus_ramadhan           | 083831353889   | Taman Bungkul                          |
 * =============================================================================
 */

// ============================================================
// REFERENCE DATA UUIDs — reused from seed-reference.ts
// ============================================================
const RAYON_SELATAN_ID = '085a298f-d8e9-435c-8a3b-998ffa47a26e';
const RAYON_UTARA_ID   = '861a7e7c-8bd5-4e73-8aa7-e92988959dca';
const RAYON_PUSAT_ID   = 'd564809d-316f-4a2a-a1c6-671eebb49653';
const RAYON_TIMUR1_ID  = '42934ad5-4ea0-4537-abb6-cf7e984e2d39';
const RAYON_TIMUR2_ID  = '742a135b-ddeb-45ca-8d0a-88d7d08aa78a';
const RAYON_BARAT1_ID  = 'bf040137-fce4-4016-b5e7-704ad82c1594';
const RAYON_BARAT2_ID  = '7422e6ee-0693-4565-9016-d4f759bdeed2';

const SHIFT_1_ID = 'ca18ac41-2577-4f67-abfa-adaae27b75c8';
const SHIFT_2_ID = '28822613-65de-47e4-a9b4-7b9bfd437f8a';
const SHIFT_3_ID = '85860407-7b2d-425a-87cc-7a94bb47e5d8';

const AT_PERAWATAN_ID          = 'ddc94ad6-a625-4c27-964f-10f3a79a6794';
const AT_PENANAMAN_ID          = 'a8cf5d46-1435-413b-ae03-8ea135bd5fb3';
const AT_PERANTINGAN_ID        = '8a890970-5fc8-4672-ae6f-b945cb80bba5';
const AT_PENYIRAMAN_ID         = '2eaed437-c662-4285-b9a7-8c7d5d0755b7';
const AT_PENYULAMAN_ID         = '70c75e9a-df48-4c71-89d5-91978112103f';
const AT_POTONG_RUMPUT_ID      = '715b8196-8473-4afe-9103-adb6c2ee7c50';
const AT_ANGKUT_SAMPAH_ID      = 'eef48fdc-e235-4a03-9fc4-517cff92c8bb';
const AT_LAINNYA_SATGAS_ID     = '4153cd86-c6bf-4f06-b536-5016a74114d5';
const AT_PATROLI_ID            = 'dd7efc02-36fe-4e70-b4b5-bfa163fc3bb0';
const AT_INSIDEN_ID            = '3a37e00b-7702-4296-b387-96964b45e251';
const AT_PERIKSA_FASILITAS_ID  = 'b4e7c1a2-3d5f-4e8a-9b0c-1d2e3f4a5b6c';
const AT_HALAU_PKL_ID          = 'c5f8d2b3-4e6a-4f9b-8c1d-2e3f4a5b6c7d';
const AT_LAINNYA_LINMAS_ID     = 'd6a9e3c4-5f7b-4a0c-9d2e-3f4a5b6c7d8e';
const AT_CEK_KENDARAAN_ID      = 'e7b0f4d5-6a8c-4b1d-8e3f-4a5b6c7d8e9f';
const AT_PATROLI_KORLAP_ID     = 'f8c1a5e6-7b9d-4c2e-9f4a-5b6c7d8e9f0a';
const AT_CEK_ALAT_ID           = 'a9d2b6f7-8c0e-4d3f-8a5b-6c7d8e9f0a1b';
const AT_LAINNYA_KORLAP_ID     = 'b0e3c7a8-9d1f-4e4a-9b6c-7d8e9f0a1b2c';
const AT_CEK_ABSENSI_ID        = 'c1f4d8b9-0e2a-4f5b-8c7d-8e9f0a1b2c3d';
const AT_ENTRI_LAPORAN_ID      = 'd2a5e9c0-1f3b-4a6c-9d8e-9f0a1b2c3d4e';
const AT_LAINNYA_ADMIN_DATA_ID = 'e3b6f0d1-2a4c-4b7d-8e9f-0a1b2c3d4e5f';

const SPECIAL_DAY_1_ID = 'aee11144-0a99-458f-90b2-3df456f5bdf0';
const SPECIAL_DAY_2_ID = 'd2bb4962-0d2e-46fb-b45d-c3038254f5c4';
const SPECIAL_DAY_3_ID = '72bfe1fd-6285-4853-a4a9-d75e8edc65e6';
const SPECIAL_DAY_4_ID = '8a8ff3d8-8c45-461e-b66c-8563c04cbbd5';

// ============================================================
// STAGING AREA UUIDs — 13 areas from KMZ (all Rayon Pusat)
// ============================================================
const AREA_BUNGKUL_ID     = '51a1b2c3-d4e5-4f67-8901-2a3b4c5d6e7f'; // Taman Bungkul (park/ACTIVE)
const AREA_DARMO_P1_ID    = '51b2c3d4-e5f6-4a78-9012-3b4c5d6e7f80'; // Darmo Pulau 1 — Depan Taman Bungkul
const AREA_DARMO_P2_ID    = '51c3d4e5-f6a7-4b89-0123-4c5d6e7f8091'; // Darmo Pulau 2 — Depan Graha Wonokoyo
const AREA_DARMO_P3_ID    = '51d4e5f6-a7b8-4c90-1234-5d6e7f809102'; // Darmo Pulau 3 — Depan RS. Darmo
const AREA_DARMO_P4_ID    = '51e5f6a7-b8c9-4d01-2345-6e7f80910213'; // Darmo Pulau 4 — Depan Santa Maria
const AREA_DARMO_P5_ID    = '51f6a7b8-c9d0-4e12-3456-7f8091021324'; // Darmo Pulau 5 — Depan CIMB Niaga
const AREA_DARMO_BCA_ID   = '52a7b8c9-d0e1-4f23-4567-809102132435'; // Darmo — Depan Bank BCA
const AREA_NGAGEL_ID      = '52b8c9d0-e1f2-4034-5678-910213243546'; // Jl. Ngagel BAT
const AREA_DINOYO_ID      = '52c9d0e1-f2a3-4145-6789-021324354657'; // Jl. Dinoyo Tenun
const AREA_PROGO_ID       = '52d0e1f2-a3b4-4256-7890-132435465768'; // Jl. Progo
const AREA_SERAYU_ID      = '52e1f2a3-b4c5-4367-8901-243546576879'; // Jl. Serayu
const AREA_BENGAWAN_ID    = '52f2a3b4-c5d6-4478-9012-345657687980'; // Jl. Bengawan
const AREA_DARMO_KALI_ID  = '53a3b4c5-d6e7-4589-0123-456768798091'; // Jl. Darmo Kali

// ============================================================
// STAGING USER UUIDs
// ============================================================
// Test users
const USER_SUPERADMIN_ID       = '53b4c5d6-e7f8-4690-1234-567879809102'; // superadmin
const USER_ADMIN_SYS_ID        = '53c5d6e7-f8a9-4701-2345-678980910213'; // admin_system1
const USER_TOP_MGMT_ID         = '53d6e7f8-a9b0-4812-3456-789091021324'; // top_management1
const USER_KEPALA_RAYON_ID     = '53e7f8a9-b0c1-4923-4567-890102132435'; // kepala_rayon_pusat
const USER_ADMIN_DATA_ID       = '53f8a9b0-c1d2-4a34-5678-901213243546'; // admin_data_pusat_1
const USER_KORLAP_PUSAT1_ID    = '54a9b0c1-d2e3-4b45-6789-012324354657'; // korlap_pusat_1
const USER_KORLAP_PUSAT2_ID    = '54b0c1d2-e3f4-4c56-7890-123435465768'; // korlap_pusat_2
const USER_KORLAP_BUNGKUL_ID   = '54c1d2e3-f4a5-4d67-8901-234546576879'; // korlap_bungkul_1
const USER_SATGAS_PUSAT1_ID    = '54d2e3f4-a5b6-4e78-9012-345657687980'; // satgas_pusat_1
const USER_SATGAS_PUSAT2_ID    = '54e3f4a5-b6c7-4f89-0123-456768798091'; // satgas_pusat_2
const USER_LINMAS_PUSAT1_ID    = '54f4a5b6-c7d8-4090-1234-567879809102'; // linmas_pusat_1
const USER_LINMAS_PUSAT2_ID    = '55a5b6c7-d8e9-4101-2345-678980910213'; // linmas_pusat_2
const USER_SATGAS_BUNGKUL_ID   = '55b6c7d8-e9f0-4212-3456-789091021324'; // satgas_bungkul_1
const USER_STAFF_KEC_PUSAT_ID  = '55b6c7d8-e9f0-4212-3456-789091021325'; // staff_kec_pusat (Phase 3 — public intake)
// Real users
const USER_PRAMUDITA_ID        = '55c7d8e9-f0a1-4323-4567-890102132435'; // pramudita_yustiani
const USER_WAHYU_ID            = '55d8e9f0-a1b2-4434-5678-901213243546'; // wahyu_tri_p
const USER_BUDI_ID             = '55e9f0a1-b2c3-4545-6789-012324354657'; // budi_setyo_utomo
const USER_PONCO_ID            = '55f0a1b2-c3d4-4656-7890-123435465768'; // ponco_adi_prabowo
const USER_RAKHMAT_ID          = '56a1b2c3-d4e5-4767-8901-234546576879'; // rakhmat_novianto
const USER_ROY_ID              = '56b2c3d4-e5f6-4878-9012-345657687980'; // roy_junaidi
const USER_EDI_ID              = '56c3d4e5-f6a7-4989-0123-456768798091'; // edi_santoso
const USER_JIHAN_ID            = '56d4e5f6-a7b8-4090-1234-567879809102'; // jihan_nabila_safitri
const USER_DENI_ID             = '56e5f6a7-b8c9-4101-2345-678980910213'; // deni_purwanto
const USER_AGUS_ID             = '56f6a7b8-c9d0-4212-3456-789091021324'; // agus_ramadhan

// Pre-computed bcrypt hash for "password123" (10 salt rounds)
const PASSWORD_HASH = '$2b$10$gF9qXRA.0ZtNWgbrwoYHMOmdUFUbaL4AkGdxAEMDMrMZtFexnH.H.';

// ============================================================
// KML COORDINATE STRINGS — extracted from testing.kmz
// Format: "lng,lat,alt lng,lat,alt ..." (closing coord repeats first)
// ============================================================
const COORDS_BUNGKUL = `112.7392071965829,-7.290985462579141,0 112.7391411737621,-7.291064508751593,0 112.7391264950255,-7.29114255718752,0 112.7391286655735,-7.291252456077554,0 112.7391681843655,-7.291747764212635,0 112.7391851394908,-7.291784975623941,0 112.7392285885794,-7.291794857063579,0 112.7395320432959,-7.291829181169,0 112.7397945388575,-7.291842849530311,0 112.7400323424098,-7.291838227449356,0 112.7402129206796,-7.291810584281428,0 112.7403254645698,-7.291760130089167,0 112.7403281139282,-7.291757397074448,0 112.7404099792645,-7.291659272447585,0 112.7404722929766,-7.291529350051733,0 112.7405120880349,-7.291354280251372,0 112.7405228990565,-7.29121731462599,0 112.7404855452234,-7.29110541849071,0 112.7404114182157,-7.291047866677819,0 112.7402534669827,-7.290989262548622,0 112.7398192984285,-7.290906530226962,0 112.7396732149951,-7.290901324756218,0 112.7395030222768,-7.290907313679851,0 112.7393600642398,-7.290923499217355,0 112.7392071965829,-7.290985462579141,0`;

const COORDS_DARMO_P1 = `112.7392895488137,-7.295500688452539,0 112.7392811522987,-7.295428891706413,0 112.7392684753718,-7.295269549231628,0 112.7392550948797,-7.295037489490831,0 112.7392282313733,-7.294623740905449,0 112.7391995377378,-7.294205285917854,0 112.7391782151154,-7.293818486489188,0 112.7391607836946,-7.293475540677186,0 112.7391578958962,-7.29327474433941,0 112.7391361989128,-7.293034058987348,0 112.7391181745751,-7.292740575171175,0 112.7390969262287,-7.292347489573421,0 112.7390738782168,-7.292033757456075,0 112.7390563533713,-7.29175409333971,0 112.739024644325,-7.291376104622204,0 112.7390183906202,-7.291281991393806,0 112.7390098171483,-7.291257202436976,0 112.73898939461,-7.291263304672303,0 112.7389942232805,-7.291305308375523,0 112.7390191837731,-7.291610585087355,0 112.7390368224721,-7.291830967639599,0 112.7390561561243,-7.292131364146444,0 112.7390750562935,-7.292470043902774,0 112.7390933199425,-7.292764853339714,0 112.7391084447115,-7.293037878251277,0 112.7391265729645,-7.293259570682579,0 112.7391311916167,-7.29345603532796,0 112.7391451769185,-7.29370225962927,0 112.7391609038246,-7.29399695409665,0 112.7391838482884,-7.294313206450583,0 112.7391981471488,-7.294595757982096,0 112.739219768171,-7.294930476569813,0 112.7392308123975,-7.295094933266016,0 112.7392406793652,-7.295257898789611,0 112.7392325635959,-7.295397212224157,0 112.7392260122803,-7.295465141742797,0 112.7392895488137,-7.295500688452539,0`;

const COORDS_DARMO_P2 = `112.7390080145651,-7.291065421705054,0 112.7389996714727,-7.290905358097485,0 112.7389911311556,-7.290646865598934,0 112.7389892564254,-7.290430962105162,0 112.7389946330756,-7.290183649566711,0 112.739001578839,-7.290028006027135,0 112.7390071407283,-7.289907657729954,0 112.7390080192957,-7.289876064752145,0 112.7389863869207,-7.289870228820547,0 112.7389760456148,-7.289874020765402,0 112.7389738635046,-7.290042114747537,0 112.7389649365532,-7.290188716385773,0 112.7389551860946,-7.290460364201117,0 112.7389568839753,-7.290649537779525,0 112.7389675928855,-7.29085939211236,0 112.7389767279509,-7.291048934162305,0 112.7389887886468,-7.291069776817822,0 112.7390080145651,-7.291065421705054,0`;

const COORDS_DARMO_P3 = `112.7389878826136,-7.289722141367856,0 112.7390041518718,-7.289727519096829,0 112.7390219134472,-7.289708605721188,0 112.7391864682552,-7.288858789794571,0 112.73931897598,-7.288187573447807,0 112.7394372544996,-7.287515971442177,0 112.7396319195199,-7.286507144978543,0 112.7398253614934,-7.285418271770633,0 112.7399535304691,-7.284732226884658,0 112.7399473138568,-7.284721152343193,0 112.7399230040663,-7.28471838927606,0 112.7399175609091,-7.284738933970332,0 112.7398179527795,-7.285296112504549,0 112.7397328392158,-7.285775916491854,0 112.7396124721341,-7.286458790161833,0 112.7395155109099,-7.286960043257957,0 112.7393962376021,-7.28757748730323,0 112.7392911465757,-7.288185857839721,0 112.7391518788349,-7.288894752388278,0 112.7389996330062,-7.289647143887458,0 112.7389869909879,-7.289698968026165,0 112.7389878826136,-7.289722141367856,0`;

const COORDS_DARMO_P4 = `112.7399636252876,-7.284531950007289,0 112.7399924058631,-7.284538235870674,0 112.7400072600951,-7.28447862501951,0 112.7401829356977,-7.283511562402384,0 112.7403696513349,-7.282511145545631,0 112.7405467336104,-7.281554733141495,0 112.740552965142,-7.281481741960207,0 112.7405400987264,-7.281478992140033,0 112.7405291809554,-7.281493833668975,0 112.7405207021124,-7.281568355782605,0 112.7404456697411,-7.281984944610816,0 112.7403519775966,-7.282477587884311,0 112.7402239708796,-7.283148154577262,0 112.740086236808,-7.283884291007102,0 112.7399755499589,-7.284477161448759,0 112.7399636252876,-7.284531950007289,0`;

const COORDS_DARMO_P5 = `112.7406091609914,-7.280936539993449,0 112.7406313622486,-7.280925365422168,0 112.7407300061447,-7.280425105949908,0 112.7408600729451,-7.279760084496712,0 112.7408464500771,-7.279741581879392,0 112.7408178949059,-7.279753739148014,0 112.7406941975206,-7.280417673392772,0 112.7406195827396,-7.280800487797431,0 112.7405911608821,-7.280919980168088,0 112.7406091609914,-7.280936539993449,0`;

const COORDS_DARMO_BCA = `112.7408499698084,-7.279622452376605,0 112.7408787765059,-7.279623741390892,0 112.7408943229135,-7.279589134646816,0 112.7410222924093,-7.278934466140391,0 112.741064142335,-7.278725986326418,0 112.7411754261468,-7.27815307538198,0 112.7413039364252,-7.277433772069833,0 112.7412942550628,-7.277410981204099,0 112.7412668656152,-7.277417504979207,0 112.7412543115205,-7.277482179049758,0 112.7411405715902,-7.278124515905689,0 112.7410083102662,-7.278785673669675,0 112.7408974158905,-7.279361131136298,0 112.7408513659653,-7.279579279698091,0 112.7408499698084,-7.279622452376605,0`;

const COORDS_NGAGEL = `112.7449586797588,-7.288450909665041,0 112.7454588872769,-7.287859954900499,0 112.7463657491817,-7.286797114189932,0 112.7463243380659,-7.28677882917481,0 112.7452932782052,-7.287920378814952,0 112.7445635824781,-7.288648655113053,0 112.7447000847054,-7.288763656521048,0 112.7449586797588,-7.288450909665041,0`;

const COORDS_DINOYO = `112.7469491055027,-7.28521986892546,0 112.7467983401257,-7.285566430585367,0 112.7467302407916,-7.285725212332608,0 112.7466558673489,-7.285848834321984,0 112.7465607364926,-7.28599066330618,0 112.7464519067359,-7.28612125324495,0 112.7463757070566,-7.286205604966985,0 112.746322783092,-7.286258913672143,0 112.7463335375511,-7.286269721551556,0 112.7464570266286,-7.286140366851322,0 112.7466155661047,-7.28594107508084,0 112.7467484583054,-7.285717965455372,0 112.746892161761,-7.285377026030497,0 112.7470267595343,-7.285069304735149,0 112.7470802506504,-7.284864268060027,0 112.7470603791943,-7.284859464878602,0 112.7470112994463,-7.285067325945029,0 112.7469491055027,-7.28521986892546,0`;

const COORDS_PROGO = `112.7405367033875,-7.291769739995799,0 112.740321106237,-7.291901544863628,0 112.7405191784837,-7.291987531664613,0 112.7405367033875,-7.291769739995799,0`;

const COORDS_SERAYU = `112.7405832212487,-7.29105284073,0 112.7406925263283,-7.291309350274858,0 112.7407774807493,-7.29110051737486,0 112.7405832212487,-7.29105284073,0`;

const COORDS_BENGAWAN = `112.7406909649525,-7.290281258334188,0 112.7421574346636,-7.290991333415979,0 112.7421500580425,-7.290961723889217,0 112.7407031944334,-7.29026795458503,0 112.7406909649525,-7.290281258334188,0`;

const COORDS_DARMO_KALI = `112.7438822950957,-7.288628076126993,0 112.7435108857126,-7.289047726285016,0 112.7435191681882,-7.289055020468726,0 112.7438879761848,-7.288633444305306,0 112.7438822950957,-7.288628076126993,0`;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/** Parse KML coordinate string "lng,lat,alt ..." → [lng, lat][] (deduped closing coord) */
function parseCoords(coordStr: string): [number, number][] {
  const pairs = coordStr
    .trim()
    .split(/\s+/)
    .filter((s) => s.length > 0)
    .map((c): [number, number] => {
      const [lng, lat] = c.split(',').map(Number);
      return [lng, lat];
    });
  // Drop closing coord if it repeats the first
  const first = pairs[0];
  const last = pairs[pairs.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) {
    return pairs.slice(0, -1);
  }
  return pairs;
}

/** Compute centroid as average of polygon vertices */
function computeCentroid(coords: [number, number][]): { lat: number; lng: number } {
  const n = coords.length;
  const sumLng = coords.reduce((s, c) => s + c[0], 0);
  const sumLat = coords.reduce((s, c) => s + c[1], 0);
  return { lng: sumLng / n, lat: sumLat / n };
}

/** Shoelace formula — polygon area in approximate m² */
function computeAreaM2(coords: [number, number][]): number {
  const n = coords.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coords[i][0] * coords[j][1];
    area -= coords[j][0] * coords[i][1];
  }
  area = Math.abs(area) / 2;
  const avgLat = computeCentroid(coords).lat;
  const latM = 111320;
  const lngM = 111320 * Math.cos((avgLat * Math.PI) / 180);
  return Math.round(area * latM * lngM * 100) / 100;
}

/** Convert [lng, lat][] to GeoJSON Polygon JSON string (ring is closed automatically) */
function toGeoJson(coords: [number, number][]): string {
  const ring: [number, number][] = [...coords, coords[0]]; // close the ring
  return JSON.stringify({ type: 'Polygon', coordinates: [ring] });
}

// ============================================================
// AREA DEFINITIONS
// ============================================================
interface AreaDef {
  id: string;
  name: string;
  typeCode: 'park' | 'pedestrian';
  coordStr: string;
}

const AREA_DEFS: AreaDef[] = [
  { id: AREA_BUNGKUL_ID,    name: 'Taman Bungkul',                                       typeCode: 'park',       coordStr: COORDS_BUNGKUL    },
  { id: AREA_DARMO_P1_ID,   name: 'Jl. Raya Darmo Pulau 1 (Depan Taman Bungkul)',        typeCode: 'pedestrian', coordStr: COORDS_DARMO_P1   },
  { id: AREA_DARMO_P2_ID,   name: 'Jl. Raya Darmo Pulau 2 (Depan Graha Wonokoyo)',       typeCode: 'pedestrian', coordStr: COORDS_DARMO_P2   },
  { id: AREA_DARMO_P3_ID,   name: 'Jl. Raya Darmo Pulau 3 (Depan RS. Darmo)',            typeCode: 'pedestrian', coordStr: COORDS_DARMO_P3   },
  { id: AREA_DARMO_P4_ID,   name: 'Jl. Raya Darmo Pulau 4 (Depan Santa Maria)',          typeCode: 'pedestrian', coordStr: COORDS_DARMO_P4   },
  { id: AREA_DARMO_P5_ID,   name: 'Jl. Raya Darmo Pulau 5 (Depan CIMB Niaga)',           typeCode: 'pedestrian', coordStr: COORDS_DARMO_P5   },
  { id: AREA_DARMO_BCA_ID,  name: 'Jl. Raya Darmo (Depan Bank BCA)',                     typeCode: 'pedestrian', coordStr: COORDS_DARMO_BCA  },
  { id: AREA_NGAGEL_ID,     name: 'Jl. Ngagel BAT',                                      typeCode: 'pedestrian', coordStr: COORDS_NGAGEL     },
  { id: AREA_DINOYO_ID,     name: 'Jl. Dinoyo Tenun',                                    typeCode: 'pedestrian', coordStr: COORDS_DINOYO     },
  { id: AREA_PROGO_ID,      name: 'Jl. Progo',                                            typeCode: 'pedestrian', coordStr: COORDS_PROGO      },
  { id: AREA_SERAYU_ID,     name: 'Jl. Serayu',                                           typeCode: 'pedestrian', coordStr: COORDS_SERAYU     },
  { id: AREA_BENGAWAN_ID,   name: 'Jl. Bengawan',                                         typeCode: 'pedestrian', coordStr: COORDS_BENGAWAN   },
  { id: AREA_DARMO_KALI_ID, name: 'Jl. Darmo Kali',                                      typeCode: 'pedestrian', coordStr: COORDS_DARMO_KALI },
];

// Pedestrian-only area IDs (excludes Taman Bungkul)
const PEDESTRIAN_AREA_IDS = AREA_DEFS
  .filter((a) => a.typeCode === 'pedestrian')
  .map((a) => a.id);

// All 13 area IDs
const ALL_AREA_IDS = AREA_DEFS.map((a) => a.id);

// ============================================================
// MAIN SEEDER
// ============================================================

async function seedStaging() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 Staging / UAT Seeder — Rayon Pusat                                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('⚠️  DESTRUCTIVE — all tables will be wiped before seeding.');
  console.log('');

  // Check schema state (same pattern as seed-phase1)
  const probeSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'sekar_db',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    synchronize: false,
    logging: false,
  });
  await probeSource.initialize();
  const [{ count }] = await probeSource.query<[{ count: string }]>(
    `SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = 'public'`,
  );
  await probeSource.destroy();
  const schemaIsEmpty = parseInt(count, 10) === 0;

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'sekar_db',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    synchronize: schemaIsEmpty,
    entities: schemaIsEmpty ? [__dirname + '/../../**/*.entity{.ts,.js}'] : [],
    logging: false,
  });

  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();

  try {
    // ============================================================
    // STEP 1: TRUNCATE ALL TABLES
    // ============================================================
    console.log('🗑️  Clearing all tables...');

    const tablesToClear = [
      'audit_logs',
      // Phase 3 tables (truncated first to avoid FK conflicts)
      'seed_transactions',
      'plant_seeds',
      'service_capacity',
      'activity_plant_items',
      'pruning_requests',
      'notable_plants',
      'area_plants',
      'plant_species',
      // Phase 1/2 tables
      'user_areas',
      'user_tracking_status',
      'monitoring_configs',
      'notification_tokens',
      'notifications',
      'task_tags',
      'overtimes',
      'schedules',
      'special_day_overrides',
      'area_staff_requirements',
      'tasks',
      'location_logs',
      'activities',
      'shifts',
      'shift_definitions',
      'areas',
      'area_types',
      'activity_types',
      'rayons',
      'users',
    ];

    const existingTables: string[] = [];
    for (const table of tablesToClear) {
      const result = (await queryRunner.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1
        ) AS exists`,
        [table],
      )) as { exists: boolean }[];
      if (result[0].exists) existingTables.push(table);
    }

    if (existingTables.length > 0) {
      await queryRunner.query(
        `TRUNCATE TABLE ${existingTables.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`,
      );
    }
    console.log(`  ✓ Cleared ${existingTables.length} tables`);

    // ============================================================
    // STEP 2: AREA TYPES
    // ============================================================
    console.log('\n🏷️  Seeding area types...');
    await queryRunner.query(`
      INSERT INTO area_types (code, name, description, category) VALUES
        ('park',        'Taman',      'Taman kota dan ruang terbuka hijau publik',             'ACTIVE'),
        ('pedestrian',  'Trotoar',    'Jalur pejalan kaki di sepanjang jalan raya',             'PASSIVE'),
        ('mini_garden', 'Taman Mini', 'Taman kecil di area pemukiman atau perumahan',           'ACTIVE'),
        ('street',      'Jalanan',    'Jalanan umum yang memerlukan pemeliharaan kebersihan',   'PASSIVE')
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('  ✓ 4 area types');

    // ============================================================
    // STEP 3: SHIFT DEFINITIONS
    // ============================================================
    console.log('\n⏰ Seeding shift definitions...');
    await queryRunner.query(`
      INSERT INTO shift_definitions (id, name, code, start_time, end_time, crosses_midnight, is_active) VALUES
        ('${SHIFT_1_ID}', 'Shift 1', 'SHIFT1', '06:00:00', '15:00:00', FALSE, TRUE),
        ('${SHIFT_2_ID}', 'Shift 2', 'SHIFT2', '15:00:00', '23:00:00', FALSE, TRUE),
        ('${SHIFT_3_ID}', 'Shift 3', 'SHIFT3', '21:00:00', '05:00:00', TRUE,  TRUE)
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('  ✓ 3 shift definitions (SHIFT1 / SHIFT2 / SHIFT3)');

    // ============================================================
    // STEP 4: RAYONS (all 7 + set Pusat boundary/center)
    // ============================================================
    console.log('\n🗺️  Seeding rayons...');
    await queryRunner.query(`
      INSERT INTO rayons (id, name, code, description) VALUES
        ('${RAYON_SELATAN_ID}', 'Rayon Selatan', 'SELATAN', 'Wilayah Surabaya Selatan - Wonokromo, Wonocolo, Gayungan, Jambangan'),
        ('${RAYON_UTARA_ID}',   'Rayon Utara',   'UTARA',   'Wilayah Surabaya Utara - Krembangan, Pabean Cantian, Semampir, Kenjeran, Bulak'),
        ('${RAYON_PUSAT_ID}',   'Rayon Pusat',   'PUSAT',   'Wilayah Surabaya Pusat - Tegalsari, Genteng, Bubutan, Simokerto'),
        ('${RAYON_TIMUR1_ID}',  'Rayon Timur 1', 'TIMUR1',  'Wilayah Surabaya Timur bagian 1 - Tambaksari, Gubeng, Sukolilo'),
        ('${RAYON_TIMUR2_ID}',  'Rayon Timur 2', 'TIMUR2',  'Wilayah Surabaya Timur bagian 2 - Mulyorejo, Rungkut, Tenggilis Mejoyo, Gunung Anyar'),
        ('${RAYON_BARAT1_ID}',  'Rayon Barat 1', 'BARAT1',  'Wilayah Surabaya Barat bagian 1 - Sukomanunggal, Tandes, Asemrowo, Benowo'),
        ('${RAYON_BARAT2_ID}',  'Rayon Barat 2', 'BARAT2',  'Wilayah Surabaya Barat bagian 2 - Sawahan, Dukuh Pakis, Wiyung, Karang Pilang, Lakarsantri, Sambikerep')
      ON CONFLICT (code) DO NOTHING
    `);

    // Set Rayon Pusat center (office location) and dummy boundary covering all UAT areas
    await queryRunner.query(
      `UPDATE rayons SET
        center_lat            = $1,
        center_lng            = $2,
        boundary_polygon      = $3::jsonb,
        boundary_computed_at  = NOW()
       WHERE code = 'PUSAT'`,
      [
        -7.2745614,
        112.7579174,
        JSON.stringify({
          type: 'Polygon',
          // Rectangle covering all 13 KMZ areas + office, ~0.003° padding
          coordinates: [
            [
              [112.738, -7.273],
              [112.760, -7.273],
              [112.760, -7.299],
              [112.738, -7.299],
              [112.738, -7.273],
            ],
          ],
        }),
      ],
    );
    console.log('  ✓ 7 rayons');
    console.log('  ✓ Rayon Pusat: center (-7.2745614, 112.7579174), dummy boundary set');

    // ============================================================
    // STEP 4b: KECAMATANS (31) — May 2026
    // ============================================================
    console.log('\n🏘️  Seeding kecamatans...');
    await queryRunner.query(`
      INSERT INTO kecamatans (name, code, rayon_id, region) VALUES
        ('Bubutan',          'bubutan',          '${RAYON_PUSAT_ID}',  'pusat'),
        ('Genteng',          'genteng',          '${RAYON_PUSAT_ID}',  'pusat'),
        ('Simokerto',        'simokerto',        '${RAYON_PUSAT_ID}',  'pusat'),
        ('Tegalsari',        'tegalsari',        '${RAYON_PUSAT_ID}',  'pusat'),
        ('Tambaksari',       'tambaksari',       '${RAYON_TIMUR1_ID}', 'timur'),
        ('Gubeng',           'gubeng',           '${RAYON_TIMUR1_ID}', 'timur'),
        ('Sukolilo',         'sukolilo',         '${RAYON_TIMUR1_ID}', 'timur'),
        ('Mulyorejo',        'mulyorejo',        '${RAYON_TIMUR2_ID}', 'timur'),
        ('Rungkut',          'rungkut',          '${RAYON_TIMUR2_ID}', 'timur'),
        ('Tenggilis Mejoyo', 'tenggilis_mejoyo', '${RAYON_TIMUR2_ID}', 'timur'),
        ('Gunung Anyar',     'gunung_anyar',     '${RAYON_TIMUR2_ID}', 'timur'),
        ('Sukomanunggal',    'sukomanunggal',    '${RAYON_BARAT1_ID}', 'barat'),
        ('Tandes',           'tandes',           '${RAYON_BARAT1_ID}', 'barat'),
        ('Asemrowo',         'asemrowo',         '${RAYON_BARAT1_ID}', 'barat'),
        ('Benowo',           'benowo',           '${RAYON_BARAT1_ID}', 'barat'),
        ('Pakal',            'pakal',            '${RAYON_BARAT1_ID}', 'barat'),
        ('Sambikerep',       'sambikerep',       '${RAYON_BARAT2_ID}', 'barat'),
        ('Lakarsantri',      'lakarsantri',      '${RAYON_BARAT2_ID}', 'barat'),
        ('Sawahan',          'sawahan',          '${RAYON_BARAT2_ID}', 'selatan'),
        ('Dukuh Pakis',      'dukuh_pakis',      '${RAYON_BARAT2_ID}', 'selatan'),
        ('Wiyung',           'wiyung',           '${RAYON_BARAT2_ID}', 'selatan'),
        ('Karang Pilang',    'karang_pilang',    '${RAYON_BARAT2_ID}', 'selatan'),
        ('Krembangan',       'krembangan',       '${RAYON_UTARA_ID}',  'utara'),
        ('Pabean Cantian',   'pabean_cantian',   '${RAYON_UTARA_ID}',  'utara'),
        ('Semampir',         'semampir',         '${RAYON_UTARA_ID}',  'utara'),
        ('Kenjeran',         'kenjeran',         '${RAYON_UTARA_ID}',  'utara'),
        ('Bulak',            'bulak',            '${RAYON_UTARA_ID}',  'utara'),
        ('Wonokromo',        'wonokromo',        '${RAYON_SELATAN_ID}','selatan'),
        ('Wonocolo',         'wonocolo',         '${RAYON_SELATAN_ID}','selatan'),
        ('Gayungan',         'gayungan',         '${RAYON_SELATAN_ID}','selatan'),
        ('Jambangan',        'jambangan',        '${RAYON_SELATAN_ID}','selatan')
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('  ✓ 31 kecamatans seeded');

    // ============================================================
    // STEP 5: ACTIVITY TYPES
    // ============================================================
    console.log('\n🔧 Seeding activity types...');
    await queryRunner.query(`
      INSERT INTO activity_types (id, name, code, description, applicable_roles, is_active) VALUES
        ('${AT_PERAWATAN_ID}',           'Perawatan',                  'perawatan',          'Perawatan tanaman dan area',           ARRAY['satgas'],      TRUE),
        ('${AT_PENANAMAN_ID}',           'Penanaman',                  'penanaman',          'Penanaman tanaman baru',               ARRAY['satgas'],      TRUE),
        ('${AT_PERANTINGAN_ID}',         'Perantingan',                'perantingan',        'Pemangkasan ranting pohon',            ARRAY['satgas'],      TRUE),
        ('${AT_PENYIRAMAN_ID}',          'Penyiraman',                 'penyiraman',         'Penyiraman tanaman',                   ARRAY['satgas'],      TRUE),
        ('${AT_PENYULAMAN_ID}',          'Penyulaman',                 'penyulaman',         'Penggantian tanaman mati',             ARRAY['satgas'],      TRUE),
        ('${AT_POTONG_RUMPUT_ID}',       'Potong Rumput',              'potong_rumput',      'Pemotongan rumput',                    ARRAY['satgas'],      TRUE),
        ('${AT_ANGKUT_SAMPAH_ID}',       'Angkut Sampah',              'angkut_sampah',      'Pengangkutan sampah',                  ARRAY['satgas'],      TRUE),
        ('${AT_LAINNYA_SATGAS_ID}',      'Lainnya',                    'lainnya_satgas',     'Aktivitas satgas lainnya',             ARRAY['satgas'],      TRUE),
        ('${AT_PATROLI_ID}',             'Patroli',                    'patroli',            'Patroli keamanan area',                ARRAY['linmas'],      TRUE),
        ('${AT_INSIDEN_ID}',             'Insiden',                    'insiden',            'Pelaporan insiden keamanan',           ARRAY['linmas'],      TRUE),
        ('${AT_PERIKSA_FASILITAS_ID}',   'Memeriksa Kondisi Fasilitas','periksa_fasilitas',  'Pemeriksaan kondisi fasilitas',        ARRAY['linmas'],      TRUE),
        ('${AT_HALAU_PKL_ID}',           'Halau PKL',                  'halau_pkl',          'Penertiban pedagang kaki lima',        ARRAY['linmas'],      TRUE),
        ('${AT_LAINNYA_LINMAS_ID}',      'Lainnya',                    'lainnya_linmas',     'Aktivitas linmas lainnya',             ARRAY['linmas'],      TRUE),
        ('${AT_CEK_KENDARAAN_ID}',       'Pengecekan Kendaraan',       'cek_kendaraan',      'Pemeriksaan kendaraan operasional',    ARRAY['korlap'],      TRUE),
        ('${AT_PATROLI_KORLAP_ID}',      'Patroli',                    'patroli_korlap',     'Patroli area kerja',                   ARRAY['korlap'],      TRUE),
        ('${AT_CEK_ALAT_ID}',            'Pengecekan Alat',            'cek_alat',           'Pemeriksaan peralatan kerja',          ARRAY['korlap'],      TRUE),
        ('${AT_LAINNYA_KORLAP_ID}',      'Lainnya',                    'lainnya_korlap',     'Aktivitas korlap lainnya',             ARRAY['korlap'],      TRUE),
        ('${AT_CEK_ABSENSI_ID}',         'Cek Absensi',                'cek_absensi',        'Pengecekan data absensi',              ARRAY['admin_data'],  TRUE),
        ('${AT_ENTRI_LAPORAN_ID}',       'Cek dan Entri Laporan',      'entri_laporan',      'Pengecekan dan entri laporan',         ARRAY['admin_data'],  TRUE),
        ('${AT_LAINNYA_ADMIN_DATA_ID}',  'Lainnya',                    'lainnya_admin_data', 'Aktivitas admin data lainnya',         ARRAY['admin_data'],  TRUE)
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('  ✓ 20 activity types (8 satgas · 5 linmas · 4 korlap · 3 admin_data)');

    // ============================================================
    // STEP 6: SPECIAL DAY OVERRIDES
    // ============================================================
    console.log('\n📅 Seeding special day overrides...');
    await queryRunner.query(`
      INSERT INTO special_day_overrides (id, date, day_type, name) VALUES
        ('${SPECIAL_DAY_1_ID}', '2026-08-17', 'HOLIDAY', 'Hari Kemerdekaan'),
        ('${SPECIAL_DAY_2_ID}', '2026-12-25', 'HOLIDAY', 'Natal'),
        ('${SPECIAL_DAY_3_ID}', '2026-01-01', 'HOLIDAY', 'Tahun Baru'),
        ('${SPECIAL_DAY_4_ID}', '2026-05-01', 'HOLIDAY', 'Hari Buruh')
      ON CONFLICT (date) DO NOTHING
    `);
    console.log('  ✓ 4 special day overrides');

    // ============================================================
    // STEP 7: MONITORING CONFIGS
    // ============================================================
    console.log('\n📡 Seeding monitoring configs...');
    const monitoringConfigs = [
      {
        key: 'status_thresholds',
        value: JSON.stringify({
          active_max_age_seconds: 300,
          inactive_threshold_seconds: 900,
          missing_threshold_seconds: 3600,
          location_ping_interval_seconds: 60,
        }),
        description: 'Status calculation thresholds',
      },
      {
        key: 'geofencing',
        value: JSON.stringify({ tolerance_meters: 50, outside_area_grace_seconds: 120 }),
        description: 'Geofencing tolerance settings',
      },
      {
        key: 'map_defaults',
        value: JSON.stringify({
          center_lat: -7.2745614,
          center_lng: 112.7579174,
          zoom: 14,
          cluster_zoom_threshold: 16,
          cluster_threshold: 20,
        }),
        description: 'Map default view (Rayon Pusat office)',
      },
      {
        key: 'alerts',
        value: JSON.stringify({
          missing_user_notify: true,
          understaffed_notify: true,
          low_battery_threshold: 20,
        }),
        description: 'Alert configuration',
      },
      {
        key: 'location_ping',
        value: JSON.stringify({ interval_seconds: 60, batch_size: 10 }),
        description: 'Mobile location ping settings',
      },
    ];

    for (const cfg of monitoringConfigs) {
      await queryRunner.query(
        `INSERT INTO monitoring_configs (key, value, description)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (key) DO NOTHING`,
        [cfg.key, cfg.value, cfg.description],
      );
    }
    console.log('  ✓ 5 monitoring configs (map_defaults centered on Rayon Pusat office)');

    // ============================================================
    // STEP 8: AREAS (13 from KMZ, all Rayon Pusat)
    // ============================================================
    console.log('\n📍 Seeding areas from KMZ...');

    for (const areaDef of AREA_DEFS) {
      const coords = parseCoords(areaDef.coordStr);
      const { lat, lng } = computeCentroid(coords);
      const coverageArea = computeAreaM2(coords);
      const boundaryPolygon = toGeoJson(coords);

      await queryRunner.query(
        `INSERT INTO areas (
          id, name, area_type_id, gps_lat, gps_lng, radius_meters,
          boundary_polygon, coverage_area, rayon_id, is_active
        )
        SELECT
          $1, $2,
          (SELECT id FROM area_types WHERE code = $3 LIMIT 1),
          $4, $5, 100,
          $6::jsonb, $7,
          $8, TRUE
        ON CONFLICT (id) DO NOTHING`,
        [
          areaDef.id,
          areaDef.name,
          areaDef.typeCode,
          lat,
          lng,
          boundaryPolygon,
          coverageArea,
          RAYON_PUSAT_ID,
        ],
      );
      console.log(
        `  ✓ ${areaDef.name.substring(0, 55).padEnd(55)} | ` +
          `lat: ${lat.toFixed(6)}  lng: ${lng.toFixed(6)}  area: ${Math.round(coverageArea)} m²`,
      );
    }
    console.log(`  → ${AREA_DEFS.length} areas seeded (1 park + 12 pedestrian)`);

    // ============================================================
    // STEP 9: USERS (13 test + 10 real = 23 total)
    // ============================================================
    console.log('\n👥 Seeding users...');

    // Helper: insert a user row
    // Phase 3 Apr 27 — accepts optional `kecamatanName` for staff_kecamatan users.
    const insertUser = async (
      id: string,
      username: string,
      fullName: string,
      role: string,
      phone: string,
      rayonId: string | null = null,
      areaId: string | null = null,
      kecamatanName: string | null = null,
    ) => {
      await queryRunner.query(
        `INSERT INTO users (id, username, password_hash, full_name, phone_number, role, rayon_id, area_id, kecamatan_name, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
         ON CONFLICT (username) DO NOTHING`,
        [id, username, PASSWORD_HASH, fullName, phone, role, rayonId, areaId, kecamatanName],
      );
    };

    // ── System-wide (no area/rayon scope) ──────────────────────
    await insertUser(USER_SUPERADMIN_ID, 'superadmin',       'Super Admin',       'superadmin',    '081200000010');
    await insertUser(USER_ADMIN_SYS_ID,  'admin_system1',    'Admin System',      'admin_system',  '081200000011');
    await insertUser(USER_TOP_MGMT_ID,   'top_management1',  'Top Management',    'top_management','081200000012');

    // ── Rayon Pusat — management ───────────────────────────────
    await insertUser(USER_KEPALA_RAYON_ID, 'kepala_rayon_pusat',  'Kepala Rayon Pusat',   'kepala_rayon', '081200000013', RAYON_PUSAT_ID);
    await insertUser(USER_ADMIN_DATA_ID,   'admin_data_pusat_1',  'Admin Data Pusat 1',   'admin_data',   '081200000014', RAYON_PUSAT_ID);

    // ── Rayon Pusat — korlap (primary area = Taman Bungkul; extras via user_areas) ──
    await insertUser(USER_KORLAP_PUSAT1_ID,  'korlap_pusat_1',  'Korlap Pusat 1',  'korlap', '081200000015', RAYON_PUSAT_ID, AREA_BUNGKUL_ID);
    await insertUser(USER_KORLAP_PUSAT2_ID,  'korlap_pusat_2',  'Korlap Pusat 2',  'korlap', '081200000016', RAYON_PUSAT_ID, AREA_BUNGKUL_ID);
    await insertUser(USER_KORLAP_BUNGKUL_ID, 'korlap_bungkul_1','Korlap Bungkul 1','korlap', '081200000017', RAYON_PUSAT_ID, AREA_BUNGKUL_ID);

    // ── Rayon Pusat — satgas / linmas ──────────────────────────
    // satgas_pusat_1: all 13 areas → primary = Taman Bungkul
    await insertUser(USER_SATGAS_PUSAT1_ID,  'satgas_pusat_1',   'Satgas Pusat 1',   'satgas', '081200000018', RAYON_PUSAT_ID, AREA_BUNGKUL_ID);
    // satgas_pusat_2: 12 pedestrian only → primary = Darmo Pulau 1
    await insertUser(USER_SATGAS_PUSAT2_ID,  'satgas_pusat_2',   'Satgas Pusat 2',   'satgas', '081200000019', RAYON_PUSAT_ID, AREA_DARMO_P1_ID);
    // linmas_pusat_1: all 13 areas → primary = Taman Bungkul
    await insertUser(USER_LINMAS_PUSAT1_ID,  'linmas_pusat_1',   'Linmas Pusat 1',   'linmas', '081200000020', RAYON_PUSAT_ID, AREA_BUNGKUL_ID);
    // linmas_pusat_2: Taman Bungkul only
    await insertUser(USER_LINMAS_PUSAT2_ID,  'linmas_pusat_2',   'Linmas Pusat 2',   'linmas', '081200000021', RAYON_PUSAT_ID, AREA_BUNGKUL_ID);
    // satgas_bungkul_1: Taman Bungkul only
    await insertUser(USER_SATGAS_BUNGKUL_ID, 'satgas_bungkul_1', 'Satgas Bungkul 1', 'satgas', '081200000022', RAYON_PUSAT_ID, AREA_BUNGKUL_ID);

    // ── Phase 3 — public intake (staff_kecamatan) ──────────────
    // staff_kec_pusat: scoped to Rayon Pusat for testing pruning_requests workflow.
    // Apr 27 redesign: kecamatan_name attribution added so the redesigned mobile
    // submit form can preset rayon + kecamatan from the user profile.
    await insertUser(USER_STAFF_KEC_PUSAT_ID, 'staff_kec_pusat', 'Staff Kecamatan Pusat', 'staff_kecamatan', '081200000023', RAYON_PUSAT_ID, null, 'Tegalsari');

    // ── Real users ─────────────────────────────────────────────
    await insertUser(USER_PRAMUDITA_ID, 'pramudita_yustiani',   'Pramudita Yustiani',   'top_management', '08563302643');
    await insertUser(USER_WAHYU_ID,     'wahyu_tri_p',          'Wahyu Tri P',          'superadmin',     '081232939377');
    await insertUser(USER_BUDI_ID,      'budi_setyo_utomo',     'Budi Setyo Utomo',     'kepala_rayon',   '081200000001', RAYON_PUSAT_ID);
    await insertUser(USER_PONCO_ID,     'ponco_adi_prabowo',    'Ponco Adi Frabowo',    'admin_data',     '081200000002', RAYON_PUSAT_ID);
    await insertUser(USER_RAKHMAT_ID,   'rakhmat_novianto',     'RAKHMAT NOVIANTO',     'satgas',         '087825841818', RAYON_PUSAT_ID, AREA_DARMO_P1_ID);
    await insertUser(USER_ROY_ID,       'roy_junaidi',          'ROY JUNAIDI',          'satgas',         '083854355341', RAYON_PUSAT_ID, AREA_DARMO_P2_ID);
    await insertUser(USER_EDI_ID,       'edi_santoso',          'EDI SANTOSO',          'satgas',         '085855434561', RAYON_PUSAT_ID, AREA_BUNGKUL_ID);
    await insertUser(USER_JIHAN_ID,     'jihan_nabila_safitri', 'JIHAN NABILA SAFITRI', 'satgas',         '08970900786',  RAYON_PUSAT_ID, AREA_BUNGKUL_ID);
    await insertUser(USER_DENI_ID,      'deni_purwanto',        'DENI PURWANTO',        'linmas',         '081554017822', RAYON_PUSAT_ID, AREA_BUNGKUL_ID);
    await insertUser(USER_AGUS_ID,      'agus_ramadhan',        'AGUS RAMADHAN',        'linmas',         '083831353889', RAYON_PUSAT_ID, AREA_BUNGKUL_ID);

    console.log('  ✓ 14 test users + 10 real users = 24 total (incl. staff_kec_pusat for Phase 3)');

    // ── May 2026 — staff_kecamatan_<code> per kecamatan (31) ────────
    // The redesigned mobile submit form pre-fills rayon + kecamatan from the
    // logged-in user, so each kecamatan must have its own login. Idempotent.
    console.log('\n🧑‍💼 Seeding 31 per-kecamatan staff_kecamatan users...');
    const kecRows = (await queryRunner.query(
      `SELECT id, name, code, rayon_id FROM kecamatans ORDER BY name`,
    )) as Array<{ id: string; name: string; code: string; rayon_id: string }>;
    let kecPhoneSeq = 100;
    for (const k of kecRows) {
      const username = `staff_kecamatan_${k.code}`;
      const phone = `0812000${String(kecPhoneSeq).padStart(5, '0')}`;
      kecPhoneSeq += 1;
      await queryRunner.query(
        `INSERT INTO users (username, password_hash, full_name, phone_number,
                            role, rayon_id, area_id, kecamatan_name, kecamatan_id, is_active)
         VALUES ($1, $2, $3, $4, 'staff_kecamatan', $5, NULL, $6, $7, TRUE)
         ON CONFLICT (username) DO NOTHING`,
        [username, PASSWORD_HASH, `Staff Kecamatan ${k.name}`, phone, k.rayon_id, k.name, k.id],
      );
    }
    await queryRunner.query(`
      UPDATE users u SET kecamatan_id = k.id
      FROM kecamatans k
      WHERE u.role = 'staff_kecamatan'
        AND u.kecamatan_id IS NULL
        AND u.kecamatan_name IS NOT NULL
        AND lower(k.name) = lower(u.kecamatan_name)
    `);
    console.log(`  ✓ 31 per-kecamatan staff users seeded; legacy backfilled`);

    // ============================================================
    // STEP 10: DERIVE rayon_id FOR FIELD WORKERS (from area.rayon_id)
    // ============================================================
    console.log('\n📌 Deriving rayon_id for field workers...');
    await queryRunner.query(`
      UPDATE users u
      SET rayon_id = a.rayon_id
      FROM areas a
      WHERE u.area_id = a.id
        AND u.rayon_id IS NULL
        AND u.role IN ('satgas', 'linmas', 'korlap')
    `);
    console.log('  ✓ rayon_id derived for all field workers');

    // ============================================================
    // STEP 11: USER_AREAS (permanent assignments)
    // ============================================================
    console.log('\n🗺️  Seeding user_areas assignments...');

    const superadminId = USER_SUPERADMIN_ID;

    // Helper: insert a single user_area assignment
    const assignArea = async (userId: string, areaId: string) => {
      await queryRunner.query(
        `INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
         VALUES ($1, $2, 'permanent', $3)
         ON CONFLICT DO NOTHING`,
        [userId, areaId, superadminId],
      );
    };

    // korlap_pusat_1 → all 13 areas
    for (const areaId of ALL_AREA_IDS) await assignArea(USER_KORLAP_PUSAT1_ID, areaId);
    console.log('  ✓ korlap_pusat_1 → all 13 areas');

    // korlap_pusat_2 → all 13 areas
    for (const areaId of ALL_AREA_IDS) await assignArea(USER_KORLAP_PUSAT2_ID, areaId);
    console.log('  ✓ korlap_pusat_2 → all 13 areas');

    // korlap_bungkul_1 → Taman Bungkul only
    await assignArea(USER_KORLAP_BUNGKUL_ID, AREA_BUNGKUL_ID);
    console.log('  ✓ korlap_bungkul_1 → Taman Bungkul');

    // satgas_pusat_1 → all 13 areas
    for (const areaId of ALL_AREA_IDS) await assignArea(USER_SATGAS_PUSAT1_ID, areaId);
    console.log('  ✓ satgas_pusat_1 → all 13 areas');

    // satgas_pusat_2 → 12 pedestrian only (no Taman Bungkul)
    for (const areaId of PEDESTRIAN_AREA_IDS) await assignArea(USER_SATGAS_PUSAT2_ID, areaId);
    console.log('  ✓ satgas_pusat_2 → 12 pedestrian areas (no Taman Bungkul)');

    // linmas_pusat_1 → all 13 areas
    for (const areaId of ALL_AREA_IDS) await assignArea(USER_LINMAS_PUSAT1_ID, areaId);
    console.log('  ✓ linmas_pusat_1 → all 13 areas');

    // linmas_pusat_2 → Taman Bungkul only
    await assignArea(USER_LINMAS_PUSAT2_ID, AREA_BUNGKUL_ID);
    console.log('  ✓ linmas_pusat_2 → Taman Bungkul');

    // satgas_bungkul_1 → Taman Bungkul only
    await assignArea(USER_SATGAS_BUNGKUL_ID, AREA_BUNGKUL_ID);
    console.log('  ✓ satgas_bungkul_1 → Taman Bungkul');

    // Real users
    await assignArea(USER_RAKHMAT_ID, AREA_DARMO_P1_ID);
    console.log('  ✓ rakhmat_novianto → Jl. Raya Darmo Pulau 1');
    await assignArea(USER_ROY_ID, AREA_DARMO_P2_ID);
    console.log('  ✓ roy_junaidi → Jl. Raya Darmo Pulau 2');
    for (const uid of [USER_EDI_ID, USER_JIHAN_ID, USER_DENI_ID, USER_AGUS_ID]) {
      await assignArea(uid, AREA_BUNGKUL_ID);
    }
    console.log('  ✓ edi_santoso, jihan_nabila_safitri, deni_purwanto, agus_ramadhan → Taman Bungkul');

    // ============================================================
    // STEP 12: USER_TRACKING_STATUS (all clockable → offline)
    // ============================================================
    console.log('\n📡 Seeding user_tracking_status (all offline)...');
    await queryRunner.query(`
      INSERT INTO user_tracking_status (user_id, status, is_within_area, area_id, rayon_id, updated_at)
      SELECT u.id, 'offline', FALSE, u.area_id, u.rayon_id, NOW()
      FROM users u
      WHERE u.role IN ('satgas', 'linmas', 'korlap', 'admin_data', 'kepala_rayon')
      ON CONFLICT (user_id) DO UPDATE SET
        status     = 'offline',
        updated_at = NOW()
    `);

    const countResult = (await queryRunner.query(`
      SELECT COUNT(*) AS clockable_count FROM users
      WHERE role IN ('satgas', 'linmas', 'korlap', 'admin_data', 'kepala_rayon')
    `)) as { clockable_count: string }[];
    const clockable_count = countResult[0].clockable_count;
    console.log(`  ✓ ${clockable_count} clockable users set to offline`);

    // ============================================================
    // STEP 13: AREA STAFF REQUIREMENTS (minimal: 1 satgas + 1 linmas per area, SHIFT1/WEEKDAY)
    // ============================================================
    console.log('\n📋 Seeding area staff requirements...');

    for (const areaDef of AREA_DEFS) {
      // 1 satgas per area — Shift 1, Weekday
      await queryRunner.query(
        `INSERT INTO area_staff_requirements (area_id, shift_definition_id, role, required_count, day_type)
         VALUES ($1, $2, 'satgas', 1, 'WEEKDAY')`,
        [areaDef.id, SHIFT_1_ID],
      );
      // 1 linmas per area — Shift 1, Weekday (linmas primarily in parks, but include all for coverage)
      await queryRunner.query(
        `INSERT INTO area_staff_requirements (area_id, shift_definition_id, role, required_count, day_type)
         VALUES ($1, $2, 'linmas', 1, 'WEEKDAY')`,
        [areaDef.id, SHIFT_1_ID],
      );
    }
    console.log(`  ✓ ${AREA_DEFS.length * 2} requirements (13 areas × 2 roles: satgas + linmas, SHIFT1/WEEKDAY)`);

    // ============================================================
    // STEP 14: PHASE 3 DATA (plants, capacity, pruning, seeds)
    // ============================================================
    const phase3Check = await queryRunner.query(
      `SELECT to_regclass('public.plant_species') AS exists`,
    );
    if (phase3Check[0]?.exists) {
      console.log('\n🌳 Seeding Phase 3 reference data...');
      await seedPhase3Reference(queryRunner);
      // Staging gets capacity_units=5 so testers can actually book pruning slots.
      // The capacity grid is a reference baseline (rayon × ISO week × pruning),
      // not transaction data — empty cells would break the booking UI on day one.
      await seedPhase3ServiceCapacity(queryRunner, 5);
      // NOTE: `seedPhase3SampleData` deliberately NOT called for staging.
      // Per project policy, the staging seed should contain only essentials
      // (reference data + users) — no dummy area_plants, notable_plants,
      // pruning_requests, plant_seeds, or seed_transactions. UAT testers
      // start from an empty state and create their own data, mirroring how
      // production starts. Sample/dummy rows live in `db:seed:phase3` (dev only).
    } else {
      console.log('\n⚠️  Phase 3 tables not found — skipping Phase 3 seed.');
      console.log('   Run `npm run migration:run` first, then re-run the seeder.');
    }

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ Staging Seeding Completed Successfully                                      ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('  Reference Data');
    console.log('  ─────────────────────────────────────────────────────────────────────────────────');
    console.log('  4   area types · 3 shift definitions · 7 rayons · 20 activity types');
    console.log('  4   special day overrides · 5 + 4 monitoring configs (Phase 2D + Phase 3)');
    console.log('  128 plant_species · service_capacity grid (7 × 12 weeks, capacity_units=5)');
    console.log('');
    console.log('  Rayon Pusat UAT Data');
    console.log('  ─────────────────────────────────────────────────────────────────────────────────');
    console.log('  13 areas     — 1 Taman Bungkul (aktif) + 12 Kawasan Darmo pedestrian (pasif)');
    console.log('  24 users     — 14 test + 10 real (all password: password123)');
    console.log('  user_areas   — permanent assignments per spec');
    console.log(`  ${clockable_count} users  — user_tracking_status: offline (clean start for UAT)`);
    console.log('  26 reqs      — area_staff_requirements: 13 areas × satgas + linmas (SHIFT1/WEEKDAY)');
    console.log('');
    console.log('  Phase 3 Reference Data');
    console.log('  ─────────────────────────────────────────────────────────────────────────────────');
    console.log('  service_capacity  — 7 rayons × 12 ISO weeks × pruning (capacity_units=5)');
    console.log('  ');
    console.log('  Phase 3 transaction tables are EMPTY by design (essentials-only policy):');
    console.log('  0 area_plants · 0 notable_plants · 0 pruning_requests · 0 plant_seeds · 0 seed_transactions');
    console.log('');
    console.log('  0 shifts · 0 activities · 0 tasks · 0 overtimes · 0 location_logs');
    console.log('  → All transaction tables are empty — UAT starts from scratch ✓');
    console.log('');
    console.log('  ── TEST USERS (all: password123) ─────────────────────────────────────────────────');
    console.log('  superadmin         superadmin           081200000010');
    console.log('  admin_system       admin_system1        081200000011');
    console.log('  top_management     top_management1      081200000012');
    console.log('  kepala_rayon       kepala_rayon_pusat   081200000013   Rayon Pusat');
    console.log('  admin_data         admin_data_pusat_1   081200000014   Rayon Pusat');
    console.log('  korlap             korlap_pusat_1       081200000015   All 13 areas');
    console.log('  korlap             korlap_pusat_2       081200000016   All 13 areas');
    console.log('  korlap             korlap_bungkul_1     081200000017   Taman Bungkul');
    console.log('  satgas             satgas_pusat_1       081200000018   All 13 areas');
    console.log('  satgas             satgas_pusat_2       081200000019   12 pedestrian only');
    console.log('  linmas             linmas_pusat_1       081200000020   All 13 areas');
    console.log('  linmas             linmas_pusat_2       081200000021   Taman Bungkul');
    console.log('  satgas             satgas_bungkul_1     081200000022   Taman Bungkul');
    console.log('  staff_kecamatan    staff_kec_pusat      081200000023   Rayon Pusat (Phase 3)');
    console.log('');
    console.log('  ── REAL USERS (all: password123) ─────────────────────────────────────────────────');
    console.log('  top_management     pramudita_yustiani   08563302643    —');
    console.log('  superadmin         wahyu_tri_p          081232939377   —');
    console.log('  kepala_rayon       budi_setyo_utomo     081200000001   Rayon Pusat');
    console.log('  admin_data         ponco_adi_prabowo    081200000002   Rayon Pusat');
    console.log('  satgas             rakhmat_novianto     087825841818   Darmo Pulau 1');
    console.log('  satgas             roy_junaidi          083854355341   Darmo Pulau 2');
    console.log('  satgas             edi_santoso          085855434561   Taman Bungkul');
    console.log('  satgas             jihan_nabila_safitri 08970900786    Taman Bungkul');
    console.log('  linmas             deni_purwanto        081554017822   Taman Bungkul');
    console.log('  linmas             agus_ramadhan        083831353889   Taman Bungkul');
    console.log('══════════════════════════════════════════════════════════════════════════════════════');
  } catch (error) {
    console.error('\n❌ Staging seeding failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seedStaging()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
