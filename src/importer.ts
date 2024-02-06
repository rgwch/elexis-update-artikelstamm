import { Writable } from "stream";
import { ArtikelstammItem, Limitation, Pack, Preparation, Substance } from "./types";
import mysql from "mysql2/promise";
import { Artikelstamm } from "./artikelstamm";

export class Importer {
    private conn: mysql.Connection | null = null;
    private artikelstamm:Artikelstamm| null = null;
  
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
        this.artikelstamm = new Artikelstamm(this.conn, this.log)
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
            await this.artikelstamm!.updateOrAdd(prep, pack)
        }
        return true
    }

   
}