import { XMLParser } from "fast-xml-parser";
import fs from "fs/promises";

/**
 * Convert XML to JSON
 */
export class Parser {
    private parser = new XMLParser();
    constructor() { }

    public async parse(filename: string): Promise<any> {
        const xml = await fs.readFile(filename, "utf-8");
        const jsonObj = this.parser.parse(xml);
        return jsonObj;
    }
}   
