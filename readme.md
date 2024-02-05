# Elexis-Update-Artikelstamm

For several years, [Medelexis AG](https://www.medelexis.ch) provided the monthly ["Artikelstamm"](https://artikelstamm.elexis.info/v5/) update, which is necessary in Elexis to prescribe or apply medicaments and medicals available in Switzerland. Recently, this service was (temporarly?) shut down, so OpenSource users were stuck with expired versions.

To reduce dependency from commercial sites, this project replaces the medelexis service. It fetches original data from:

https://www.xn--spezialittenliste-yqb.ch/File.axd?file=XMLPublications.zip
(Official list of medicaments,"Spezialitätenliste" from the swiss authorities)

<!--
and 

https://www.hin.ch/services/mediupdate-xml/
(List of other medical products available in Switzerland. This list s provided by [ywesee GmbH](https://ywesee.com), and [Zur Rose](https://www.zurrose.ch))
-->

Then, it extracts informations from there and updates the "artikelstamm_ch" and "artikel" tables in Elexis. Unlike the original importer, it does not run from the Elexis program, but directly on the database. This way, it can run automatically as a cron job on Linux servers without interrupting normal work.

**Note: This program comes with absolutely no warranty. If you use it, you do so at your own risk. This program might seriously damage your data. Backup and/or test with an unconnected database instance ist strongly recommended!**

## Getting started

You'll need nodejs installed. (Tested with V18.19)

```
git clone https://github.com/rgwch/elexis-update-artikelstamm
cd elexis-update-artikelstamm
npm i
nano .env
  mysql_host=<address of mysql-server>
  mysql_port=<port of mysql server>
  mysql_user=<username for mysql server>
  mysql_pwd=<password for mysql server>
  mysql_db=<database name of the elexis DB>
^X
npm run build
node dest/index.js
```

The program will replace all articles which have newer entries in the official lists, and add articles which are not yet in the database. A list of updated and inserted articles is placed in data/import.log

## Recommended usage

If manual test worked, create a cron job which runs every 2nd of the month and calls `node dest/index.js`. 

## Layout of the artikelstamm_ch table:

```
+-----------------+--------------+------+-----+
| Field           | Type         | Null | Key |
+-----------------+--------------+------+-----+
| id              | varchar(40)  | NO   | PRI |  UUID
| lastupdate      | bigint(20)   | YES  |     |  timestamp
| deleted         | char(1)      | YES  |     |  "1" if deleted
| type            | char(1)      | YES  | MUL |  (P)harma (N)onpharma (X)Product
| bb              | char(1)      | YES  | MUL |  0,2,9
| cumm_version    | char(4)      | YES  | MUL | 
| gtin            | varchar(14)  | YES  | MUL |  EAN
| phar            | char(7)      | YES  | MUL |  Pharmacode
| dscr            | varchar(100) | YES  |     |  Name
| adddscr         | varchar(50)  | YES  |     |  Additional description
| atc             | char(10)     | YES  |     | 
| comp_gln        | char(13)     | YES  |     | 
| comp_name       | varchar(255) | YES  |     | 
| pexf            | char(10)     | YES  |     |  Ex factory price 
| ppub            | char(10)     | YES  |     |  public price
| pkg_size        | char(6)      | YES  |     |  package size
| sl_entry        | char(1)      | YES  |     |  
| ikscat          | char(1)      | YES  |     |  
| limitation      | char(1)      | YES  |     |  
| limitiation_pts | char(4)      | YES  |     | 
| limitation_txt  | longtext     | YES  |     | 
| generic_type    | char(1)      | YES  |     | (O)riginal, (G)eneric
| has_generic     | char(1)      | YES  |     | "0", "1", Null
| lppv            | char(1)      | YES  |     | "0", "1", null
| deductible      | char(6)      | YES  |     | NULL, 10,20, 40
| narcotic        | char(1)      | YES  |     | "0","1",NULL
| narcotic_cas    | varchar(20)  | YES  |     | 
| vaccine         | char(1)      | YES  |     | "0", "1", NULL
| lieferantid     | varchar(40)  | YES  |     | 
| maxbestand      | varchar(4)   | YES  |     | 
| minbestand      | varchar(4)   | YES  |     | 
| istbestand      | varchar(4)   | YES  |     | 
| verkaufseinheit | varchar(4)   | YES  |     | 
| anbruch         | varchar(4)   | YES  |     | 
| extinfo         | longblob     | YES  |     | 
| prodno          | varchar(10)  | YES  |     | 
| substance       | varchar(255) | YES  |     | 
| LDSCR           | varchar(100) | YES  | MUL | 
| K70_ENTRY       | char(1)      | YES  |     | "0","1",NULL
+-----------------+--------------+------+-----+
```

## Layout of the artikel table
```
+-------------+--------------+------+-----+
| Field       | Type         | Null | Key | 
+-------------+--------------+------+-----+
| id          | varchar(40)  | NO   | PRI | UUID
| subid       | varchar(20)  | YES  | MUL | id in code system
| lieferantid | varchar(40)  | YES  |     | 
| name        | varchar(254) | YES  | MUL | 
| name_intern | varchar(254) | YES  |     | 
| maxbestand  | varchar(4)   | YES  |     | 
| minbestand  | varchar(4)   | YES  |     | 
| istbestand  | varchar(4)   | YES  |     | 
| ek_preis    | varchar(8)   | YES  |     | cents
| vk_preis    | varchar(8)   | YES  |     | cents
| typ         | varchar(15)  | YES  | MUL | Medical, Eigenartikel,Medikament
| codeclass   | varchar(10)  | YES  | MUL | G, K, N, O, P, U
| extid       | varchar(25)  | YES  |     | 
| extinfo     | blob         | YES  |     | 
| klasse      | varchar(80)  | YES  |     | bagmedi,medikament,medical
| deleted     | char(1)      | YES  |     | 0,1,NULL
| ean         | varchar(15)  | YES  |     | GTIN
| lastupdate  | bigint(20)   | YES  |     | timestamp
| lastimport  | bigint(20)   | YES  |     | timestamp
| validfrom   | char(8)      | YES  |     | yyyymmdd
| validto     | char(8)      | YES  |     | yyyymmdd
| atc_code    | varchar(255) | YES  |     | 
+-------------+--------------+------+-----+
```