import { ArtikelItem, Preparation, Pack } from "./types";
import { Writable } from "stream";
import mysql from "mysql2/promise";
import { v4 as uuidv4 } from 'uuid';
const CODECLASS = "ch.elexis.medikamente.bag.data.BAGMedi"

export class BAGMedi {
  constructor(private conn: mysql.Connection, private log: Writable) {
    log.write("BAGMedi created\n " + new Date().toISOString() + "\n")
  }

  public async updateOrAdd(prep: Preparation, pack: Pack): Promise<boolean> {
    let ex: Partial<ArtikelItem> | null = null
    try {
      const [rows, fields] = await this.conn!.execute("SELECT * FROM artikel WHERE klasse = ? AND (ean = ? or subid = ?)", [CODECLASS, pack.GTIN, prep.SwissmedicNo5]);
      if (Array.isArray(rows) && rows.length > 0) {
        ex = rows[0] as ArtikelItem
        const lastimport: string = ex.lastimport?.toString() ?? "0"
        const status = prep.Status
        const statusDate = status.ValidFromDate.substring(6, 10) + status.ValidFromDate.substring(3, 5) + status.ValidFromDate.substring(0, 2)
        if (statusDate > lastimport) {
          this.updateEntry(ex, prep, pack)
          const logentry = "update " + prep.NameDe + " " + prep.DescriptionDe + " " + pack.DescriptionDe + " " + pack.GTIN
          console.log(logentry)
          this.log.write(logentry + "\n")
          await this.conn!.execute("UPDATE artikel SET ")
        }
      } else {
        ex = {
          id: uuidv4(),
          lastupdate: BigInt(new Date().getTime()),
          deleted: "0",
          typ: "Medikament",
          ean: pack.GTIN
        }
        this.updateEntry(ex, prep, pack)
        const keys = Object.keys(ex).join(", ")
        const values = Object.values(ex).map(v => "\"" + v + "\"").join(", ")
        const logentry = "insert new " + prep.NameDe + " " + prep.DescriptionDe + " " + pack.DescriptionDe + " " + pack.GTIN + "\n"
        console.log(logentry)
        this.log.write(logentry + "\n")
        await this.conn!.execute(`INSERT INTO artikelstamm_ch (${keys}) VALUES (${values})`)
      }
    } catch (e) {
      this.log.write("Error: " + e + "\n")
      return false;
    }
    return true;
  }

  private updateEntry(ex: Partial<ArtikelItem>, prep: Preparation, pack: Pack) {
  }

}