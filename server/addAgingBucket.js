const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const { createClient } = require("@supabase/supabase-js");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY)
  throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Aging bucket data aggregated from Aging_buckets.csv
// Columns: bucket_0_30, bucket_31_60, bucket_61_90, bucket_90_plus
// Run this ONCE to add aging data to your existing debtors table.
// Pre-requisite: add the 4 columns to your Supabase table first (SQL below).

/*
-- Run this SQL in Supabase SQL Editor first:
ALTER TABLE debtors ADD COLUMN IF NOT EXISTS bucket_0_30    numeric DEFAULT 0;
ALTER TABLE debtors ADD COLUMN IF NOT EXISTS bucket_31_60   numeric DEFAULT 0;
ALTER TABLE debtors ADD COLUMN IF NOT EXISTS bucket_61_90   numeric DEFAULT 0;
ALTER TABLE debtors ADD COLUMN IF NOT EXISTS bucket_90_plus numeric DEFAULT 0;
*/

const AGING_DATA = [
  {
    "id": 1,
    "name": "JPA Van Noort Gassler & Co B.V.",
    "bucket_0_30": 169167.28,
    "bucket_31_60": 183416.32,
    "bucket_61_90": 178584.9,
    "bucket_90_plus": 3198393.81
  },
  {
    "id": 10,
    "name": "Stichting Studeren/Werken op Maat",
    "bucket_0_30": 3872.0,
    "bucket_31_60": 3297.25,
    "bucket_61_90": 3297.25,
    "bucket_90_plus": 9723.26
  },
  {
    "id": 100,
    "name": "C. Gray",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 261.66
  },
  {
    "id": 101,
    "name": "L. van Schaik Holding B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 249.56
  },
  {
    "id": 102,
    "name": "Werken op Maat B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 242.0
  },
  {
    "id": 103,
    "name": "Work Secure Uitzendbureau",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 181.5
  },
  {
    "id": 104,
    "name": "Ultramar Agency LTD",
    "bucket_0_30": 181.5,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 105,
    "name": "Einhaus Beheer B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 121.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 106,
    "name": "Rwsolarclean",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 114.0
  },
  {
    "id": 107,
    "name": "Van Schaik Vleesverwerking",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 75.63
  },
  {
    "id": 108,
    "name": "Vereniging Young Professionals van de Stichting Studeren & Werken op Maat",
    "bucket_0_30": 42.35,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 109,
    "name": "St\u00c3\u00b6cklin B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 0.26
  },
  {
    "id": 11,
    "name": "Duckies B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 9825.56,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 8769.96
  },
  {
    "id": 110,
    "name": "Kumkol Restructuring B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 111,
    "name": "Limits-Consulting B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 112,
    "name": "Elm Finance B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 113,
    "name": "H. van der  Waal",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 114,
    "name": "Fair Audit",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 115,
    "name": "Troodos Services International B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 116,
    "name": "Sollors & Co. (GmbH) & Co. KG)",
    "bucket_0_30": 0,
    "bucket_31_60": 0,
    "bucket_61_90": 0,
    "bucket_90_plus": 0
  },
  {
    "id": 117,
    "name": "STUUR!",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": -847.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 118,
    "name": "Coffeeshop Dizzy Duck B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": -1028.5
  },
  {
    "id": 119,
    "name": "Du Cap",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": -4250.0
  },
  {
    "id": 12,
    "name": "Elstgeest Ventures B.V.",
    "bucket_0_30": 347.88,
    "bucket_31_60": 347.88,
    "bucket_61_90": 347.88,
    "bucket_90_plus": 11508.84
  },
  {
    "id": 120,
    "name": "Stichting Micu Zuidwest Nederland",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": -36905.0
  },
  {
    "id": 13,
    "name": "Autodemontagebedrijf Th. van Gils B.V.",
    "bucket_0_30": 2998.38,
    "bucket_31_60": 9164.18,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 14,
    "name": "Rijks Investments B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 12014.16
  },
  {
    "id": 15,
    "name": "G8plus B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 11753.15
  },
  {
    "id": 16,
    "name": "American Soulfood",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 11495.0
  },
  {
    "id": 17,
    "name": "Serviceheroes B.V.",
    "bucket_0_30": 2640.83,
    "bucket_31_60": 3658.92,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 4887.31
  },
  {
    "id": 18,
    "name": "Amigo Top B.V.",
    "bucket_0_30": 5749.21,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 5407.59
  },
  {
    "id": 19,
    "name": "TOFF concept",
    "bucket_0_30": 242.0,
    "bucket_31_60": 242.0,
    "bucket_61_90": 242.0,
    "bucket_90_plus": 9038.14
  },
  {
    "id": 2,
    "name": "Van Noort Gassler & Co. 's-Gravenhage B.V.",
    "bucket_0_30": 26511.03,
    "bucket_31_60": 254.03,
    "bucket_61_90": 254.03,
    "bucket_90_plus": 175983.64
  },
  {
    "id": 20,
    "name": "Autobedrijf Tinga & Zn",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 9075.0
  },
  {
    "id": 21,
    "name": "Hans van Rooij Consultancy",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 9075.0
  },
  {
    "id": 22,
    "name": "Heron Groep B.V.",
    "bucket_0_30": 529.38,
    "bucket_31_60": 529.38,
    "bucket_61_90": 529.38,
    "bucket_90_plus": 6617.24
  },
  {
    "id": 23,
    "name": "Auroria Pecunia B.V.",
    "bucket_0_30": 653.4,
    "bucket_31_60": 707.85,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 6618.7
  },
  {
    "id": 24,
    "name": "M.P. Polderdijk Holding B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 6322.25
  },
  {
    "id": 25,
    "name": "Interlex",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 5915.51
  },
  {
    "id": 26,
    "name": "Levels Diagnostics B.V.",
    "bucket_0_30": 5747.5,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 27,
    "name": "Co\u00c3\u00b6peratieve Vijftientien U.A.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 4962.01
  },
  {
    "id": 28,
    "name": "Deelman Timmerwerken B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 4900.5
  },
  {
    "id": 29,
    "name": "AirFlow Luchtkanalen B.V.",
    "bucket_0_30": 272.25,
    "bucket_31_60": 877.25,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 3630.38
  },
  {
    "id": 3,
    "name": "Van Noort Gassler & Co. Utrecht B.V.",
    "bucket_0_30": 0,
    "bucket_31_60": 0,
    "bucket_61_90": 0,
    "bucket_90_plus": 0
  },
  {
    "id": 30,
    "name": "Meydanim Den Haag B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 4737.58
  },
  {
    "id": 31,
    "name": "Ray Consultancy B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 4640.37
  },
  {
    "id": 32,
    "name": "Stichting Zwitserse Kamer van Koophandel in Nederland",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 4537.5
  },
  {
    "id": 33,
    "name": "RMA Loodgieter",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 3682.64
  },
  {
    "id": 34,
    "name": "A.J.F. Jansen B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 3646.64
  },
  {
    "id": 35,
    "name": "Respublica B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 3584.63
  },
  {
    "id": 36,
    "name": "RJD Infra",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 3575.55
  },
  {
    "id": 37,
    "name": "Moussaten Infra",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 3521.1
  },
  {
    "id": 38,
    "name": "Plaats22",
    "bucket_0_30": 3444.77,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 39,
    "name": "Rob Hotting Art & Concept",
    "bucket_0_30": 0.0,
    "bucket_31_60": 907.5,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 2343.77
  },
  {
    "id": 4,
    "name": "Van Noort Gassler & Co. Haarlem B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 524.63,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 17690.2
  },
  {
    "id": 40,
    "name": "MBE Invest B.V.",
    "bucket_0_30": 399.3,
    "bucket_31_60": 399.3,
    "bucket_61_90": 399.3,
    "bucket_90_plus": 1996.5
  },
  {
    "id": 41,
    "name": "Yepmedia B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 1795.34,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 1361.25
  },
  {
    "id": 42,
    "name": "Grefet Limited",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 3138.43
  },
  {
    "id": 43,
    "name": "By Lauyaju",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 3064.93
  },
  {
    "id": 44,
    "name": "Z & S Sales and Marketing B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 2571.33
  },
  {
    "id": 45,
    "name": "B. Jeddi",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 2518.52
  },
  {
    "id": 46,
    "name": "Korswill NL",
    "bucket_0_30": 272.25,
    "bucket_31_60": 272.25,
    "bucket_61_90": 272.25,
    "bucket_90_plus": 1633.5
  },
  {
    "id": 47,
    "name": "M.P. Harten",
    "bucket_0_30": 0.0,
    "bucket_31_60": 1253.44,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 1149.5
  },
  {
    "id": 48,
    "name": "Mavi infra",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 2263.91
  },
  {
    "id": 49,
    "name": "Deelman Holding B.V.",
    "bucket_0_30": 242.0,
    "bucket_31_60": 1031.53,
    "bucket_61_90": 242.0,
    "bucket_90_plus": 2420.0
  },
  {
    "id": 5,
    "name": "Pijnex Internationationaal Transport",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 44425.0
  },
  {
    "id": 50,
    "name": "Eye Tech International B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 2128.11
  },
  {
    "id": 51,
    "name": "M.O. Multiservice",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 2078.43
  },
  {
    "id": 52,
    "name": "Van Bergen 1795 B.V.",
    "bucket_0_30": 561.44,
    "bucket_31_60": 423.5,
    "bucket_61_90": 423.5,
    "bucket_90_plus": 561.44
  },
  {
    "id": 53,
    "name": "Rick Sandee Riooltechniek",
    "bucket_0_30": 121.0,
    "bucket_31_60": 121.0,
    "bucket_61_90": 121.0,
    "bucket_90_plus": 1524.6
  },
  {
    "id": 54,
    "name": "Stichting Antarctica Foundation",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 1815.0
  },
  {
    "id": 55,
    "name": "Kraskino Consultants Ltd.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 1725.26
  },
  {
    "id": 56,
    "name": "DreamersInc",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 1724.25
  },
  {
    "id": 57,
    "name": "Year 2024",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 1627.45
  },
  {
    "id": 58,
    "name": "Hooimani El M'Barki Real Estate B.V.",
    "bucket_0_30": 102.85,
    "bucket_31_60": 302.5,
    "bucket_61_90": 302.5,
    "bucket_90_plus": 907.5
  },
  {
    "id": 59,
    "name": "FTOU B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 1599.01
  },
  {
    "id": 6,
    "name": "R.A.U. Juchter van Bergen Quast B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 40270.76
  },
  {
    "id": 60,
    "name": "Zorlu Infra",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 1544.43
  },
  {
    "id": 61,
    "name": "Willems WorkShop",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 1474.71
  },
  {
    "id": 62,
    "name": "Rijks Invest B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 1452.0
  },
  {
    "id": 63,
    "name": "Lelie Engineering",
    "bucket_0_30": 350.9,
    "bucket_31_60": 350.9,
    "bucket_61_90": 350.9,
    "bucket_90_plus": 350.9
  },
  {
    "id": 64,
    "name": "Bense Bouw B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 1276.87
  },
  {
    "id": 65,
    "name": "Manfred Spaargaren Confiserie",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 1210.0
  },
  {
    "id": 66,
    "name": "Happy B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 605.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 605.0
  },
  {
    "id": 67,
    "name": "Van Gils Onroerend Goed B.V.",
    "bucket_0_30": 575.96,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 575.96
  },
  {
    "id": 68,
    "name": "Stichting Werken Op Maat.",
    "bucket_0_30": 1084.16,
    "bucket_31_60": 0.0,
    "bucket_61_90": -0.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 69,
    "name": "Zentrex Capital B.V.",
    "bucket_0_30": 356.95,
    "bucket_31_60": 356.95,
    "bucket_61_90": 356.95,
    "bucket_90_plus": 0.0
  },
  {
    "id": 7,
    "name": "LUKOIL International Upstream Holdings B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 28645.24
  },
  {
    "id": 70,
    "name": "Meat & Chicken Forepark B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 1017.91
  },
  {
    "id": 71,
    "name": "VOF T.H. Thio en T.H. Thio-Ong",
    "bucket_0_30": 0.0,
    "bucket_31_60": 998.25,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 72,
    "name": "FCKLCK.STUDIO B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 302.5,
    "bucket_61_90": 302.5,
    "bucket_90_plus": 302.5
  },
  {
    "id": 73,
    "name": "Hashtag Holding B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 895.4
  },
  {
    "id": 74,
    "name": "Payslip Ltd.",
    "bucket_0_30": -500.0,
    "bucket_31_60": 500.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 848.52
  },
  {
    "id": 75,
    "name": "TelePlusGSM Retail B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 830.06
  },
  {
    "id": 76,
    "name": "Zengin Oglanlar Holding B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 757.6
  },
  {
    "id": 77,
    "name": "Bladi shop",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 756.25
  },
  {
    "id": 78,
    "name": "Gaoui Beheer B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 726.0
  },
  {
    "id": 79,
    "name": "Van Gils Holding B.V.",
    "bucket_0_30": 715.11,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 8,
    "name": "Vincent van der Weijden Holding B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 605.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 22742.62
  },
  {
    "id": 80,
    "name": "Korput Consultancy B.V.",
    "bucket_0_30": 574.75,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 81,
    "name": "Patrick van Gils Beheer B.V.",
    "bucket_0_30": 563.86,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 82,
    "name": "Vindure B.V.",
    "bucket_0_30": 0,
    "bucket_31_60": 0,
    "bucket_61_90": 0,
    "bucket_90_plus": 0
  },
  {
    "id": 83,
    "name": "Paragon 28 Medical Devices Trading Limited",
    "bucket_0_30": 500.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 27.0
  },
  {
    "id": 84,
    "name": "Kipcentrum Forepark B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 517.28
  },
  {
    "id": 85,
    "name": "Tradeplus24 Nederland B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 484.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 86,
    "name": "Einhaus Holding B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 242.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 242.0
  },
  {
    "id": 87,
    "name": "NL Working Capital B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 484.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 88,
    "name": "Valet Parkeer Service",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 453.75
  },
  {
    "id": 89,
    "name": "Looqa B.V.",
    "bucket_0_30": 319.65,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 126.0
  },
  {
    "id": 9,
    "name": "Lewis Fashion Group B.V.",
    "bucket_0_30": -363.0,
    "bucket_31_60": 1842.71,
    "bucket_61_90": 121.0,
    "bucket_90_plus": 21474.76
  },
  {
    "id": 90,
    "name": "Knowdis B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 415.94,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 91,
    "name": "Bats",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 363.0
  },
  {
    "id": 92,
    "name": "New Learning Factory B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 181.5,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 181.5
  },
  {
    "id": 93,
    "name": "NEVE Trans B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 361.77
  },
  {
    "id": 94,
    "name": "Morpho Holding B.V.",
    "bucket_0_30": 356.95,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 95,
    "name": "Morpho AGRI I B.V.",
    "bucket_0_30": 356.95,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 96,
    "name": "Deel 2",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 338.8
  },
  {
    "id": 97,
    "name": "FYMH B.V.",
    "bucket_0_30": 0.0,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 319.44
  },
  {
    "id": 98,
    "name": "Intelligence Group B.V.",
    "bucket_0_30": 302.5,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 0.0
  },
  {
    "id": 99,
    "name": "Zapateros B.V.",
    "bucket_0_30": 272.25,
    "bucket_31_60": 0.0,
    "bucket_61_90": 0.0,
    "bucket_90_plus": 0.0
  }
];

async function run() {
  let ok = 0, fail = 0;
  for (const row of AGING_DATA) {
    const { error } = await supabase
      .from("debtors")
      .update({
        bucket_0_30:    row.bucket_0_30,
        bucket_31_60:   row.bucket_31_60,
        bucket_61_90:   row.bucket_61_90,
        bucket_90_plus: row.bucket_90_plus,
      })
      .eq("id", row.id);

    if (error) {
      console.error(`✗ id=${row.id} ${row.name.slice(0,40)}: ${error.message}`);
      fail++;
    } else {
      console.log(`✓ id=${row.id} ${row.name.slice(0,40)} | 0-30: €${row.bucket_0_30} | 31-60: €${row.bucket_31_60} | 61-90: €${row.bucket_61_90} | 90+: €${row.bucket_90_plus}`);
      ok++;
    }
  }
  console.log(`\n─── Done ───`);
  console.log(`✓ Updated: ${ok}`);
  console.log(`✗ Failed:  ${fail}`);
}

run();