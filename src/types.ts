/**
 * Product from oddb_product.xml
 */
export type Product = {
    GTIN: string
    PRODNO: string
    DSCRD: string
    DSCRF: string
    ATC: string
    IT: string
    CPT: string
    PackGrSwissmedic: number
    EinheitSwissmedic: string
    SubstanceSwismedic: string
    CompositionSwissmedic: string
}

/**
 * Article from oddb_article.xml
 */
export type Article = {
    REF_DATA: number
    SALECD: string
    CDBG: string
    BG: string
    DSCRD: string
    DSCRF: string
    SORTD: string
    SORTF: string
    ARTCOMP: {
        COMPNO: string
    }
    ARTBAR: {
        CDTYP: string
    }
    ARTINS: {
        NINCD: string
    }
}

/**
 * Preparation from Preparations.xml
 */
export type Preparation = {
    NameDe: string
    NameFr: string
    NameIt: string
    DescriptionDe: string
    DescriptionFr: string
    DescriptionIt: string
    AtcCode: string
    SwissmedicNo5: number
    FlagItLimitation: "N" | "Y"
    OrgGenCode: "O" | "G"       // O: Original, G: Generikum
    FlagSB20: "N" | "Y"         // Selbstbehalt 20% (resp 40)
    FlagGGSL: string
    CommentDe: string
    CommentFr: string
    CommentIt: string
    VatInEXF: "N" | "Y"
    GammeNumber: number
    GammeName: string
    Preismodell: string
    Packs: {
        Pack: Array<Pack> | Pack
    }
    Status: {
        IntegrationDate: string
        ValidFromDate: string           // dd.mm.yyyy
        ValidThruDate: string           // dd.mm.yyyy
        StatusTypeCodeSl: string
        StatusTypeDescriptionSI: string
        FlagApd: string
    }
    Substances: {
        Substance: Substance | Array<Substance>
    }
    ItCodes: Array<ItCode> | ItCode
}
export type ItCode = {
    Code: string
    DescriptionDe: string
    DescriptionFr: string
    DescriptionIt: string
}
export type Substance = {
    DescriptionLa: string
    Quantity: number
    QuantityUnit: string
}
export type Pack = {
    DescriptionDe: string
    DescriptionFr: string
    DescriptionIt: string
    SwissmedicCaterory: string
    SwissmedicNo8: number
    SwissmedicNo8ParallelImop: string
    FlagNarcosis: "N" | "Y"             // BTM
    FlagModal: "N" | "Y"
    FlagGGSL: "N" | "Y"
    BAGDossierNo: number
    GTIN: string
    SizePack: number
    PrevGTINcode: string
    Limitations: {
        Limitation: Array<Limitation> | Limitation
    }
    PointLimitations: number
    Prices: {
        ExFactoryPrice: Price
        PublicPrice: Price
    }

}

export type Price = {
    Price: number
    ValidFromDate: string               // dd.mm.yyyy
    DivisionDescription: string
    PriceTypecode: string
    PriceTypeDescriptionDe: string
    PriceTypeDescriptionFr: string
    PriceTypeDescriptionIt: string
    PriceChangeTypeCode: string
    PriceChangeTypeDescriptionDe: string
    PriceChangeTypeDescriptionFr: string
    PriceChangeTypeDescriptionIt: string
    LastPriceChange: string

}

export type Limitation = {
    DescriptionDe: string
    DescriptionFr: string
    DescriptionIt: string
    LimitationCode: string
    LimitationNiveau: string
    LimitationType: string
    ValidFromDate: string
    ValidThruDate: string
}

/**
 * Entry of the articlestamm_ch table
 */
export type ArtikelstammItem = {
    id: string
    lastupdate: number
    deleted: "0" | "1"
    type: "3" | "N" | "P" | "X"
    bb: "0" | "2" | "9"
    cumm_version: string
    gtin: string
    phar: string
    dscr: string
    adddscr: string
    atc: string
    comp_gln: string
    comp_name: string
    pexf: string
    ppub: string
    pkg_size: string
    sl_entry?: "0" | "1"
    ikscat: string
    limitation?: "0" | "1"
    limitiation_pts: string
    limitation_txt: string
    generic_type: "O" | "K" | "G"
    has_generic?: "0" | "1"
    lppv?: "0" | "1"
    deductible?: "10" | "20" | "40"
    narcotic: "0" | "1"
    narcotic_cas: string
    vaccine: string
    lieferantid: string
    maxbestand: string
    minbestand: string
    istbestand: string
    verkaufseinheit: string
    anbruch: string
    extinfo: Blob
    prodno: string
    substance: string
    LDSCR: string
    K70_ENTRY?: "0" | "1"
}

/**
 * Entry of the artikel table
 */
export type ArtikelItem = {
    id: string
    deleted: "0" | "1"
    lastupdate: bigint
    lastimport: bigint
    validfrom: string       // yyyymmdd
    validto: string         // yyyymmdd
    subid: string
    lieferantid: string
    name: string
    name_intern: string
    maxbestand: string
    minbestand: string
    istbestand: string
    ek_preis: string        // cents
    vk_preis: string        // cents
    typ: "Eigenartikel" | "Laborleistung" | "Medical" | "Medicals" | "Medikament" | "MiGeL"
    codeclass: " " | "G" | "K" | "N" | "O" | "P" | "U"
    extid: string
    extinfo: Blob
    klasse: "ch.elexis.medikamente.bag.data.BAGMedi" | "ch.elexis.artikel_ch.data.Medikament" | "ch.elexis.artikel_ch.data.Medical"
    ean: string
    atc_code: string
}