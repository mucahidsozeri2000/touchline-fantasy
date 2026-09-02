export type SeedPosition = "GK" | "DEF" | "MID" | "FWD";

export interface SeedPlayer {
  id: string;
  name: string;
  wikiTitle: string;
  club: string;
  position: SeedPosition;
  price: number;
  form: number;
}

export const PLAYERS: SeedPlayer[] = [
  { id: "ederson", name: "Ederson", wikiTitle: "Ederson (footballer)", club: "MCI", position: "GK", price: 5.0, form: 6.5 },
  { id: "taa", name: "Alexander-Arnold", wikiTitle: "Trent Alexander-Arnold", club: "LIV", position: "DEF", price: 7.0, form: 7.2 },
  { id: "vandijk", name: "Van Dijk", wikiTitle: "Virgil van Dijk", club: "LIV", position: "DEF", price: 6.0, form: 7.0 },
  { id: "hakimi", name: "Hakimi", wikiTitle: "Achraf Hakimi", club: "PSG", position: "DEF", price: 5.5, form: 6.8 },
  { id: "rudiger", name: "Rüdiger", wikiTitle: "Antonio Rüdiger", club: "RMA", position: "DEF", price: 5.0, form: 6.4 },
  { id: "bellingham", name: "Bellingham", wikiTitle: "Jude Bellingham", club: "RMA", position: "MID", price: 9.5, form: 8.6 },
  { id: "pedri", name: "Pedri", wikiTitle: "Pedri", club: "BAR", position: "MID", price: 6.5, form: 7.3 },
  { id: "musiala", name: "Musiala", wikiTitle: "Jamal Musiala", club: "BAY", position: "MID", price: 8.0, form: 8.0 },
  { id: "mbappe", name: "Mbappé", wikiTitle: "Kylian Mbappé", club: "RMA", position: "FWD", price: 12.5, form: 8.9 },
  { id: "haaland", name: "Haaland", wikiTitle: "Erling Haaland", club: "MCI", position: "FWD", price: 12.0, form: 9.2 },
  { id: "vinicius", name: "Vinicius Jr", wikiTitle: "Vinícius Júnior", club: "RMA", position: "FWD", price: 10.5, form: 8.3 },
  { id: "courtois", name: "Courtois", wikiTitle: "Thibaut Courtois", club: "RMA", position: "GK", price: 4.5, form: 6.9 },
  { id: "saliba", name: "Saliba", wikiTitle: "William Saliba", club: "ARS", position: "DEF", price: 5.0, form: 6.6 },
  { id: "kimmich", name: "Kimmich", wikiTitle: "Joshua Kimmich", club: "BAY", position: "MID", price: 5.5, form: 7.1 },
  { id: "kane", name: "Kane", wikiTitle: "Harry Kane", club: "BAY", position: "FWD", price: 8.5, form: 8.1 },

  { id: "alisson", name: "Alisson", wikiTitle: "Alisson (footballer)", club: "LIV", position: "GK", price: 5.5, form: 6.8 },
  { id: "dias", name: "Dias", wikiTitle: "Rúben Dias", club: "MCI", position: "DEF", price: 6.0, form: 6.1 },
  { id: "gvardiol", name: "Gvardiol", wikiTitle: "Joško Gvardiol", club: "MCI", position: "DEF", price: 6.5, form: 6.2 },
  { id: "konate", name: "Konaté", wikiTitle: "Ibrahima Konaté", club: "LIV", position: "DEF", price: 5.5, form: 5.9 },
  { id: "rice", name: "Rice", wikiTitle: "Declan Rice", club: "ARS", position: "MID", price: 6.5, form: 7.1 },
  { id: "wirtz", name: "Wirtz", wikiTitle: "Florian Wirtz", club: "LEV", position: "MID", price: 8.5, form: 8.4 },
  { id: "bsilva", name: "Bernardo Silva", wikiTitle: "Bernardo Silva", club: "MCI", position: "MID", price: 7.0, form: 6.9 },
  { id: "salah", name: "Salah", wikiTitle: "Mohamed Salah", club: "LIV", position: "FWD", price: 12.5, form: 9.0 },
  { id: "osimhen", name: "Osimhen", wikiTitle: "Victor Osimhen", club: "GAL", position: "FWD", price: 9.0, form: 7.5 },
  { id: "kvara", name: "Kvaratskhelia", wikiTitle: "Khvicha Kvaratskhelia", club: "PSG", position: "FWD", price: 9.5, form: 7.8 },

  { id: "yamal", name: "Lamine Yamal", wikiTitle: "Lamine Yamal", club: "BAR", position: "FWD", price: 9.0, form: 8.2 },
  { id: "dejong", name: "Frenkie de Jong", wikiTitle: "Frenkie de Jong", club: "BAR", position: "MID", price: 6.0, form: 6.7 },
  { id: "terstegen", name: "Ter Stegen", wikiTitle: "Marc-André ter Stegen", club: "BAR", position: "GK", price: 5.5, form: 6.9 },
  { id: "frimpong", name: "Frimpong", wikiTitle: "Jeremie Frimpong", club: "LEV", position: "DEF", price: 4.5, form: 6.5 },
];
