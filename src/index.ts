/**
 * @fileoverview This is the main file for the swissmedic importer
 */
import "dotenv/config";
import { Parser } from "./parser";
import { Importer } from "./importer"
import type { Preparation, Product } from "./types";
import unzip from 'unzipper'
import fs from "fs/promises";
import { existsSync, createWriteStream, createReadStream } from "fs";
import path from "path";
const parser = new Parser()
const SWISSMEDIC_URL = "https://www.xn--spezialittenliste-yqb.ch/File.axd?file=XMLPublications.zip"
const logfile = path.join(__dirname, "../data/import.log")
const log = createWriteStream(logfile)

download().then(() => loadData()).then(() => console.log("done")).catch(err => { console.error(err); process.exit(1) });

/**
 * Get the last modification time of a file
 * @param fname 
 * @returns 
 */
async function gettime(fname: string) {
    try {
        const stat = await fs.stat(fname)
        return stat.mtime
    } catch (e) {
        return null
    }
}
/**
 * Check if XMLPublications.zip exists and is not older than max_age. If nessecary, download it.
 * Then extract Preparations.xml from the zip file and process it.
 * @returns true if successful, false if an error occured
 */
async function download(): Promise<boolean> {
    const max_age = parseInt(process.env.max_age || (1000 * 60 * 60 * 24 * 7).toString())
    const url = process.env.SWISSMEDIC_URL || SWISSMEDIC_URL
    const zipname = path.join(__dirname, "../data/XMLPublications.zip")
    const prepname = path.join(__dirname, "../data/Preparations.xml")

    let time = await gettime(zipname)
    if (time == null || (new Date().getTime() - time.getTime()) > max_age) {
        log.write("downloading " + url + " to " + zipname + "\n")
        if (url) {
            const data = await (await fetch(url)).arrayBuffer()
            const buf = Buffer.from(data)
            await fs.writeFile(zipname, buf)
        }
    } else {
        log.write("file " + zipname + " exists\n")
    }
    time = await gettime(prepname)
    if (time == null || (new Date().getTime() - time.getTime()) > max_age) {
        log.write("extracting " + zipname + " to " + prepname + "\n")
        return new Promise((resolve, reject) => {
            createReadStream(zipname)
                .pipe(unzip.Parse())
                .on('entry', async (entry) => {
                    const fileName = entry.path;
                    console.log(fileName)
                    const type = entry.type; // 'Directory' or 'File'
                    const size = entry.size;
                    if (fileName === "Preparations.xml") {
                        const content = await entry.buffer()
                        await fs.writeFile(prepname, content);
                        resolve(true)
                    } else {
                        entry.autodrain();
                    }
                });
        });
    } else {
        log.write("file " + prepname + " exists\n")
        return true
    }
}

/**
 * Read the SL data from Preparations.xml and process it with the importer
 * @returns 
 */
async function loadData() {
    const importer = new Importer(log)
    console.log(path.join(__dirname, "../data/Preparations.xml"))
    const prepraw = await parser.parse(path.join(__dirname, "../data/Preparations.xml"));
    const preparations: Array<Preparation> = prepraw.Preparations.Preparation;
    console.log(preparations.length)
    for (const prep of preparations) {
        await importer.process(prep)
    }
    await importer.finish()
    log.close()
    return true
}