import { ArtikelstammItem, Pack, Preparation, Substance, Limitation } from "./types";
import mysql from "mysql2/promise";
import { v4 as uuidv4 } from 'uuid';
import { Writable } from "stream";



export class Artikelstamm {
  private lastupdate: Date | null = null

  constructor(private conn: mysql.Connection, private log: Writable) {
  }

  private async getLastUpdate() {
    const [result] = await this.conn.execute("SELECT dscr from artikelstamm_ch where id=\"version\"");
    if (Array.isArray(result) && result.length > 0) {
      const set: any = result[0]
      const rd: string = set.dscr
      this.lastupdate = new Date("20" + rd.substring(4, 6) + "-" + rd.substring(2, 4) + "-" + rd.substring(0, 2))
      this.log.write("last update: " + this.lastupdate.toISOString() + "\n")
    }
  }
  public async updateOrAdd(prep: Preparation, pack: Pack): Promise<boolean> {
    if (!this.lastupdate) {
      await this.getLastUpdate()
    }
    let ex: Partial<ArtikelstammItem> | null = null
    try {
      const [rows, fields] = await this.conn!.execute("SELECT * FROM artikelstamm_ch WHERE GTIN = ?", [pack.GTIN]);
      if (Array.isArray(rows) && rows.length > 0) {
        ex = rows[0] as ArtikelstammItem
        const status = prep.Status
        const statusDate = new Date(status.ValidFromDate.substring(6, 10) + "-" + status.ValidFromDate.substring(3, 5) + "-" + status.ValidFromDate.substring(0, 2))
        if (statusDate > this.lastupdate!) {
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
  /**
    * Match a database entry with a Preparation and a Pack. Update the entry with the new data.
    * @param ex 
    * @param prep 
    * @param pack 
    */
  private updateEntry(ex: Partial<ArtikelstammItem>, prep: Preparation, pack: Pack) {
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

