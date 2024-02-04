import { Writable } from "stream";
import { ArtikelstammItem, Limitation, Preparation, Substance } from "./types";
import mysql from "mysql2/promise";
import { v4 as uuidv4 } from 'uuid';

export class Importer {
    private conn: mysql.Connection | null = null;
    private lastupdate = new Date()

    constructor(private log: Writable) {
        log.write("Importer created\n " + new Date().toISOString() + "\n")
    }
    /**
     * Connect to the database and read the last update date from the version entry
     */
    public async connect() {
        this.conn = await mysql.createConnection({
            host: process.env.mysql_host,
            user: process.env.mysql_user,
            password: process.env.mysql_pwd,
            database: process.env.mysql_db,
            port: parseInt(process.env.mysql_port || "3306")
        })
        const [result] = await this.conn.execute("SELECT dscr from artikelstamm_ch where id=\"version\"");
        if (Array.isArray(result) && result.length > 0) {
            const set: any = result[0]
            const rd: string = set.dscr
            this.lastupdate = new Date("20" + rd.substring(4, 6) + "-" + rd.substring(2, 4) + "-" + rd.substring(0, 2))
            this.log.write("last update: " + this.lastupdate.toISOString() + "\n")
        }

    }
    /**
     * Update the lastupdate and dscr field of the version entry and close the connection
     */
    public async finish() {
        if (this.conn !== null) {
            const lu = new Date().getTime()
            const dat = new Date()
            const ds = dat.getDate().toString().padStart(2, "0") + (dat.getMonth() + 1).toString().padStart(2, "0") + dat.getFullYear().toString().substring(2, 4) + " " + dat.getHours().toString().padStart(2, "0") + ":" + dat.getMinutes().toString().padStart(2, "0")
            this.log.write("setting lastupdate to " + ds + "\n")
            console.log("setting lastupdate to " + ds + "\n")
            await this.conn.execute("UPDATE artikelstamm_ch SET lastupdate=?, dscr=? WHERE id=\"version\"", [lu, ds])
            await this.conn.end()
        }
    }
    /**
     * Match a Preparation from Preparations.xml with artikelstamm_ch. Update if something changed. Add if not found.
     * @param prep 
     * @returns true if successful, false if an error occured
     */
    public async process(prep: Preparation): Promise<boolean> {
        if (this.conn === null) {
            await this.connect();
        }
        const packs = Array.isArray(prep.Packs.Pack) ? prep.Packs.Pack : [prep.Packs.Pack];
        for (const pack of packs) {
            let ex: Partial<ArtikelstammItem> | null = null
            try {
                const [rows, fields] = await this.conn!.execute("SELECT * FROM artikelstamm_ch WHERE GTIN = ?", [pack.GTIN]);
                if (Array.isArray(rows) && rows.length > 0) {
                    ex = rows[0] as ArtikelstammItem
                    const status = prep.Status
                    const statusDate = new Date(status.ValidFromDate.substring(6, 10) + "-" + status.ValidFromDate.substring(3, 5) + "-" + status.ValidFromDate.substring(0, 2))
                    if (statusDate > this.lastupdate) {
                        this.updateEntry(ex, prep, pack)
                        const logentry = "update " + prep.NameDe + " " + prep.DescriptionDe + " " + pack.DescriptionDe + " " + pack.GTIN
                        console.log(logentry)
                        this.log.write(logentry + "\n")
                        await this.conn!.execute("UPDATE artikelstamm_ch SET lastupdate=?, dscr=?, LDSCR=?, atc=?, phar=?, pexf=?, ppub=?, pkg_size=?, limitation=?, limitiation_pts=?, generic_type=?, deductible=?, narcotic=?, substance=? WHERE id=?", [ex.lastupdate, ex.dscr, ex.LDSCR, ex.atc, ex.phar, ex.pexf, ex.ppub, ex.pkg_size, ex.limitation, ex.limitiation_pts, ex.generic_type, ex.deductible, ex.narcotic, ex.substance, ex.id])
                    }
                } else {
                    ex = {
                        id: uuidv4(),
                        lastupdate: new Date().getTime(),
                        deleted: "0",
                        type: "P",
                        bb: "0",
                        sl_entry: "1",
                        gtin: pack.GTIN
                    }
                    this.updateEntry(ex, prep, pack)
                    const keys = Object.keys(ex).join(", ")
                    const values = Object.values(ex).map(v => "\"" + v + "\"").join(", ")
                    const logentry = "insert new " + prep.NameDe + " " + prep.DescriptionDe + " " + pack.DescriptionDe + " " + pack.GTIN + "\n"
                    console.log(logentry)
                    this.log.write(logentry + "\n")
                    await this.conn!.execute(`INSERT INTO artikelstamm_ch (${keys}) VALUES (${values})`)
                }
                return true
            } catch (e) {
                this.log.write("error: " + e + "\n" + "(prep.NameDe)")
                console.log(e);
                if (ex) {
                    console.log(JSON.stringify(ex))
                }
                return false
            }
        }
        return true
    }

    /**
     * Match a database entry with a Preparation and a Pack. Update the entry with the new data.
     * @param ex 
     * @param prep 
     * @param pack 
     */
    private updateEntry(ex: any, prep: any, pack: any) {
        ex.lastupdate = new Date().getTime()
        ex.dscr = prep.NameDe + " " + prep.DescriptionDe + " " + pack.DescriptionDe
        ex.LDSCR = prep.CommentDe.substring(0, 99) || ""
        ex.atc = prep.AtcCode || ""
        ex.phar = prep.SwissmedicNo5?.toString() || ""
        ex.pexf = pack.Prices?.ExFactoryPrice?.Price?.toString() || "0"
        ex.ppub = pack.Prices?.PublicPrice?.Price?.toString() || "0"
        ex.pkg_size = pack.SizePack?.toString() || "0"
        if (pack.Limitations) {
            const limitations = Array.isArray(pack.Limitations.Limitation) ? pack.Limitations.Limitation : [pack.Limitations.Limitation]
            ex.limitation = "1"
            ex.limitation_txt = limitations?.map((l: Limitation) => l.DescriptionDe).join(", ") || ""
            ex.limitiation_pts = pack.PointLimitations?.toString() || ""
        } else {
            ex.limitation = "0"
            ex.limitation_txt = ""
            ex.limitiation_pts = ""
        }
        ex.generic_type = prep.OrgGenCode
        ex.deductible = prep.FlagSB20 == "Y" ? "40" : "10"
        ex.narcotic = pack.FlagNarcosis == "Y" ? "1" : "0"
        if (prep.Substances) {
            const subst = Array.isArray(prep.Substances.Substance) ? prep.Substances.Substance : [prep.Substances.Substance]
            ex.substance = (subst?.map((s: Substance) => s?.DescriptionLa).join(", ") || "").substring(0, 254)
        } else {
            ex.substance = ""
        }
    }
}