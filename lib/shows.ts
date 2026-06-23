// ---------------------------------------------------------------------------
// Data layer for Limelight. This is the single source of truth the API routes
// (app/api/*) and the server-rendered page read from.
//
// A `Show` is now a CATALOGUE entry — one of the top trending London shows you
// can search, read a brief overview of, and then *log* once you've seen it.
// The act of logging (date + theatre) is stored separately as a `LoggedVisit`
// (see lib/db.ts), so the catalogue stays a clean, swappable list of shows.
// ---------------------------------------------------------------------------

export interface Show {
  id: string;
  title: string;
  theatre: string; // the London venue it usually plays at
  address: string; // real street address, used for the Google Map + link
  city: string;
  genre: string;
  overview: string; // one-line synopsis shown in the detail panel
  accent: string; // oklch() accent colour for the stub / detail panel
}

/** A logged theatre visit — created when the user records having seen a show. */
export interface LoggedVisit {
  id: string; // unique visit id
  showId: string;
  title: string;
  theatre: string; // where THEY saw it (defaults to the show's home venue)
  city: string;
  date: string; // human display, e.g. "12 OCT 2024"
  seat: string;
  serial: string; // ticket serial, e.g. "№ 0142"
  accent: string;
  createdAt: string; // ISO timestamp
}

// Raw catalogue. Accent + id are derived below so this list stays compact and
// easy to extend. Each entry is a genuinely trending London production
// (researched June 2026): West End musicals & plays, major producing houses,
// new 2026 openings, plus notable dance and opera.
type RawShow = Omit<Show, "id" | "city" | "accent">;

const RAW: RawShow[] = [
  // ---- Musicals --------------------------------------------------------
  { title: "The Lion King", theatre: "Lyceum Theatre", address: "21 Wellington St, London WC2E 7RQ", genre: "Disney musical", overview: "Disney's record-breaking spectacle brings the African savannah to life with stunning puppetry, soaring anthems and the unforgettable story of young lion Simba." },
  { title: "Wicked", theatre: "Apollo Victoria Theatre", address: "17 Wilton Rd, London SW1V 1LG", genre: "Musical", overview: "The untold story of the witches of Oz reveals how a green-skinned outcast and a popular blonde became Elphaba and Glinda before Dorothy arrived." },
  { title: "Les Misérables", theatre: "Sondheim Theatre", address: "51 Shaftesbury Ave, London W1D 6BA", genre: "Musical", overview: "Victor Hugo's epic of revolution, redemption and unrequited love follows fugitive Jean Valjean across decades of 19th-century France in this soaring sung-through saga." },
  { title: "The Phantom of the Opera", theatre: "His Majesty's Theatre", address: "Haymarket, London SW1Y 4QL", genre: "Musical", overview: "Andrew Lloyd Webber's haunting romance follows a disfigured musical genius obsessed with a young soprano beneath the Paris Opera House." },
  { title: "Hamilton", theatre: "Victoria Palace Theatre", address: "126 Victoria St, London SW1E 5EA", genre: "Musical", overview: "Lin-Manuel Miranda's genre-blending phenomenon retells the life of American founding father Alexander Hamilton through hip-hop, R&B and showstopping rap battles." },
  { title: "Mamma Mia!", theatre: "Novello Theatre", address: "Aldwych, London WC2B 4LD", genre: "Jukebox musical", overview: "A bride-to-be invites three possible fathers to her Greek-island wedding in this sunny, feel-good romp set to the irresistible songs of ABBA." },
  { title: "The Book of Mormon", theatre: "Prince of Wales Theatre", address: "31 Coventry St, London W1D 6AS", genre: "Musical comedy", overview: "Two mismatched Mormon missionaries are sent to Uganda in this outrageously irreverent satire from the creators of South Park." },
  { title: "Matilda The Musical", theatre: "Cambridge Theatre", address: "32-34 Earlham St, London WC2H 9HU", genre: "Musical", overview: "The RSC's joyous adaptation of Roald Dahl's tale follows a gifted little girl with telekinetic powers who stands up to the monstrous Miss Trunchbull." },
  { title: "SIX the Musical", theatre: "Vaudeville Theatre", address: "404 Strand, London WC2R 0NH", genre: "Musical", overview: "The six wives of Henry VIII reclaim their stories as a glittering pop-concert girl group in this fierce, funny and fast-paced sensation." },
  { title: "Moulin Rouge! The Musical", theatre: "Piccadilly Theatre", address: "16 Denman St, London W1D 7DY", genre: "Jukebox musical", overview: "A spectacular, sequin-drenched love story set in bohemian Paris, splicing contemporary pop hits into the dazzling world of the famous nightclub." },
  { title: "Cabaret at the Kit Kat Club", theatre: "Kit Kat Club at the Playhouse Theatre", address: "Northumberland Ave, London WC2N 5DE", genre: "Musical", overview: "An immersive, decadent staging plunges audiences into a Weimar-era Berlin nightclub as Nazism rises ominously in the shadows." },
  { title: "Hadestown", theatre: "Lyric Theatre", address: "29 Shaftesbury Ave, London W1D 7ES", genre: "Musical", overview: "The Tony-winning folk-jazz retelling of the Orpheus and Eurydice myth weaves two love stories together on the road down to the underworld." },
  { title: "Operation Mincemeat", theatre: "Fortune Theatre", address: "Russell St, London WC2B 5HH", genre: "Musical comedy", overview: "Five performers gleefully reenact the bizarre true WWII plot to fool the Nazis with a corpse in this Olivier-winning comedy." },
  { title: "The Devil Wears Prada", theatre: "Dominion Theatre", address: "268-269 Tottenham Court Rd, London W1T 7AQ", genre: "Musical", overview: "With music by Elton John, the hit film becomes a glossy musical about a young assistant navigating the cutthroat world of a fashion magazine." },
  { title: "Beetlejuice", theatre: "Prince Edward Theatre", address: "Old Compton St, London W1D 4HS", genre: "Musical comedy", overview: "The ghost-with-the-most causes chaos for a recently deceased couple and a death-obsessed teen in this raucous, anarchic Tim Burton adaptation." },
  { title: "Disney's Hercules", theatre: "Theatre Royal Drury Lane", address: "Catherine St, London WC2B 5JF", genre: "Disney musical", overview: "Disney's animated favourite gets a high-energy stage makeover as the mortal son of Zeus battles to prove himself a true hero." },
  { title: "Paddington The Musical", theatre: "Savoy Theatre", address: "Savoy Court, Strand, London WC2R 0ET", genre: "Musical", overview: "Britain's beloved marmalade-loving bear from darkest Peru charms his way into the Brown family and the West End in this brand-new family musical." },
  { title: "Sinatra The Musical", theatre: "Aldwych Theatre", address: "49 Aldwych, London WC2B 4DF", genre: "Jukebox musical", overview: "A glamorous bio-musical charts Ol' Blue Eyes' rise from humble beginnings to stardom, packed with classics like 'Come Fly With Me' and 'That's Life'." },
  { title: "Oliver!", theatre: "Gielgud Theatre", address: "35-37 Shaftesbury Ave, London W1D 6AR", genre: "Musical", overview: "Lionel Bart's classic adaptation of Dickens follows a plucky orphan through the criminal underworld of Victorian London with songs like 'Consider Yourself'." },
  { title: "Jesus Christ Superstar", theatre: "London Palladium", address: "8 Argyll St, London W1F 7TF", genre: "Rock musical", overview: "Lloyd Webber and Rice's rock opera reimagines the final days of Christ in an acclaimed, arena-scale revival." },
  { title: "Cats", theatre: "Regent's Park Open Air Theatre", address: "Inner Circle, Regent's Park, London NW1 4NU", genre: "Musical", overview: "Lloyd Webber's feline phenomenon prowls outdoors as a tribe of Jellicle cats gathers under the stars to choose one for rebirth." },
  { title: "Kinky Boots The Musical", theatre: "London Coliseum", address: "St Martin's Ln, London WC2N 4ES", genre: "Musical", overview: "A struggling shoe factory is saved by a fabulous drag queen in this big-hearted, Cyndi Lauper-scored celebration of acceptance and self-expression." },
  { title: "Avenue Q", theatre: "Shaftesbury Theatre", address: "210 Shaftesbury Ave, London WC2H 8DP", genre: "Musical comedy", overview: "Puppets and humans tackle adulthood, identity and bad decisions in this cheeky, foul-mouthed Tony-winning comedy for grown-ups." },
  { title: "Heathers the Musical", theatre: "The Arts at Marble Arch", address: "Bryanston St, London W1H 7EH", genre: "Musical", overview: "Based on the cult black comedy, this darkly funny rock musical follows teen Veronica as her high-school clique turns deadly." },
  { title: "Titanique", theatre: "Criterion Theatre", address: "218-223 Piccadilly, London W1J 9HR", genre: "Jukebox musical comedy", overview: "Celine Dion hilariously hijacks the story of Titanic in this campy, riotous mashup set entirely to her chart-topping hits." },
  { title: "ABBA Voyage", theatre: "ABBA Arena", address: "Pudding Mill Ln, London E15 2RB", genre: "Concert musical", overview: "The Swedish pop legends perform as digital avatars in a groundbreaking, gravity-defying virtual concert experience built around their greatest hits." },
  { title: "The Producers", theatre: "Garrick Theatre", address: "2 Charing Cross Rd, London WC2H 0HH", genre: "Musical comedy", overview: "Mel Brooks' uproarious satire follows two scheming Broadway producers determined to strike it rich by staging a guaranteed flop." },
  { title: "Death Note: The Musical", theatre: "Barbican Theatre", address: "Silk St, London EC2Y 8DS", genre: "Musical", overview: "The hit Japanese manga becomes a dark, high-stakes musical thriller about a student who gains the power to kill with a supernatural notebook." },
  { title: "Ride the Cyclone", theatre: "Southwark Playhouse Elephant", address: "80 Newington Causeway, London SE1 6ED", genre: "Musical comedy", overview: "Six teenagers killed in a freak rollercoaster accident compete in limbo for a chance to return to life in this offbeat cult musical." },
  { title: "The Last Ship", theatre: "Theatre Royal Drury Lane", address: "Catherine St, London WC2B 5JF", genre: "Musical", overview: "Sting's stirring score powers this story of a fading shipbuilding community fighting to save their livelihood and their pride." },
  { title: "Trainspotting: The Musical", theatre: "Theatre Royal Haymarket", address: "18 Suffolk St, London SW1Y 4HT", genre: "Musical", overview: "Irvine Welsh's gritty cult tale of Edinburgh's drug scene roars onto the stage with a live band and a bold new score." },
  { title: "High Society", theatre: "Barbican Theatre", address: "Silk St, London EC2Y 8DS", genre: "Musical", overview: "Cole Porter's sparkling songs power this sophisticated romantic comedy of a society wedding thrown into chaos by old flames and tabloid reporters." },
  { title: "Jersey Boys", theatre: "New Wimbledon Theatre", address: "The Broadway, London SW19 1QG", genre: "Jukebox musical", overview: "The rags-to-riches rise of Frankie Valli and The Four Seasons unfolds through their string of unforgettable chart-topping hits." },
  { title: "High School Musical", theatre: "Troubadour Wembley Park Theatre", address: "3 Fulton Rd, Wembley, London HA9 0SP", genre: "Disney musical", overview: "Disney's beloved teen hit bounces onto the stage as East High students discover that breaking the status quo can hit all the right notes." },
  { title: "Starlight Express", theatre: "Troubadour Wembley Park Theatre", address: "3 Fulton Rd, Wembley, London HA9 0SP", genre: "Musical", overview: "Andrew Lloyd Webber's roller-skating extravaganza races again as a fleet of anthropomorphic trains speeds around the audience in a reimagined immersive arena." },
  { title: "Pride: The Musical", theatre: "National Theatre", address: "Upper Ground, South Bank, London SE1 9PX", genre: "Musical", overview: "A vibrant new musical celebrates the people and movements that shaped LGBTQ+ history and the ongoing fight for equality and joy." },
  { title: "The Boy Who Harnessed the Wind", theatre: "Aldwych Theatre", address: "49 Aldwych, London WC2B 4DF", genre: "Musical", overview: "The RSC stages the inspiring true story of a Malawian teenager who built a windmill to save his village from famine." },
  { title: "Into the Woods", theatre: "Bridge Theatre", address: "3 Potters Fields Park, London SE1 2SG", genre: "Musical", overview: "Sondheim's beloved fairy-tale collision gets its first major London revival in almost a decade, weaving classic tales into a dark and witty fable." },
  { title: "Thelma & Louise", theatre: "Young Vic", address: "66 The Cut, Lambeth, London SE1 8LZ", genre: "Musical", overview: "A world-premiere musical of the Oscar-winning film with music by Neko Case, starring Amy Lennox and Rachel Tucker as two women on the run." },
  { title: "Marie & Rosetta", theatre: "@sohoplace", address: "4 Soho Place, London W1D 3BG", genre: "Musical", overview: "Beverley Knight stars in this Chichester transfer about gospel pioneer Sister Rosetta Tharpe and protégée Marie Knight, two trailblazing women of soul." },
  { title: "Singin' in the Rain", theatre: "Sadler's Wells", address: "Rosebery Avenue, Clerkenwell, London EC1R 4TN", genre: "Musical", overview: "The smash-hit stage adaptation returns for a summer season, splashing the iconic MGM score and its famous downpour across the stage." },
  { title: "Ruth", theatre: "Wilton's Music Hall", address: "1 Graces Alley, London E1 8JB", genre: "Musical", overview: "A new musical dramatising the life of Ruth Ellis, the last woman executed in Britain, staged in a historic Victorian hall." },

  // ---- Plays -----------------------------------------------------------
  { title: "The Mousetrap", theatre: "St Martin's Theatre", address: "West St, London WC2H 9NZ", genre: "Thriller", overview: "Agatha Christie's record-breaking whodunit, the world's longest-running play, traps a group of strangers in a snowbound guesthouse with a killer among them." },
  { title: "The Play That Goes Wrong", theatre: "Duchess Theatre", address: "3-5 Catherine St, London WC2B 5LA", genre: "Comedy", overview: "An accident-prone amateur drama society attempts a 1920s murder mystery as collapsing sets and forgotten lines turn the evening into chaotic slapstick perfection." },
  { title: "Harry Potter and the Cursed Child", theatre: "Palace Theatre", address: "113 Shaftesbury Ave, London W1D 5AY", genre: "Play", overview: "The eighth Harry Potter story follows a grown-up Harry and his son Albus through time-twisting adventures in a spellbinding, award-laden stage spectacular." },
  { title: "Stranger Things: The First Shadow", theatre: "Phoenix Theatre", address: "110 Charing Cross Rd, London WC2H 0JP", genre: "Play", overview: "A jaw-dropping prequel to the Netflix hit reveals the eerie origins of Hawkins through spectacular stage illusions and supernatural thrills." },
  { title: "Witness for the Prosecution", theatre: "London County Hall", address: "Belvedere Rd, London SE1 7PB", genre: "Thriller", overview: "Agatha Christie's gripping courtroom drama plays out in the atmospheric chamber of County Hall as a sensational murder trial twists toward a shocking verdict." },
  { title: "2:22 A Ghost Story", theatre: "Lyric Theatre", address: "29 Shaftesbury Ave, London W1D 7ES", genre: "Thriller", overview: "A dinner party turns spine-tingling when a new mother insists her house is haunted, daring her sceptical guests to stay awake until 2:22am." },
  { title: "To Kill a Mockingbird", theatre: "Wyndham's Theatre", address: "32-36 Charing Cross Rd, London WC2H 0DA", genre: "Drama", overview: "Aaron Sorkin's acclaimed adaptation of Harper Lee's classic sees lawyer Atticus Finch defend a Black man falsely accused in the racially divided Deep South." },
  { title: "Grace Pervades", theatre: "Theatre Royal Haymarket", address: "18 Suffolk St, London SW1Y 4HT", genre: "Drama", overview: "David Hare's new play stars Ralph Fiennes and Miranda Raison in a richly drawn portrait of the great Victorian actor-managers Henry Irving and Ellen Terry." },
  { title: "Inter Alia", theatre: "Wyndham's Theatre", address: "32-36 Charing Cross Rd, London WC2H 0DA", genre: "Drama", overview: "Rosamund Pike stars as a Crown Court judge whose professional certainties collide with her family life in Suzie Miller's searing legal drama." },
  { title: "Romeo & Juliet", theatre: "Harold Pinter Theatre", address: "6 Panton St, London SW1Y 4DN", genre: "Shakespeare", overview: "Sadie Sink and Noah Jupe lead Robert Icke's bold new staging of Shakespeare's tragedy of two young lovers doomed by their feuding families." },
  { title: "Glengarry Glen Ross", theatre: "The Old Vic", address: "The Cut, Lambeth, London SE1 8NB", genre: "Drama", overview: "David Mamet's Pulitzer-winning play follows ruthless real-estate salesmen clawing for survival in a cutthroat world of bluster, betrayal and broken deals." },
  { title: "The Price", theatre: "Wyndham's Theatre", address: "32-36 Charing Cross Rd, London WC2H 0DA", genre: "Drama", overview: "Arthur Miller's drama brings two estranged brothers together to dispose of their late father's furniture, unearthing decades of resentment and reckoning." },
  { title: "Les Liaisons Dangereuses", theatre: "Theatre Royal Haymarket", address: "18 Suffolk St, London SW1Y 4HT", genre: "Drama", overview: "Lesley Manville leads Christopher Hampton's elegant tale of seduction and revenge among scheming aristocrats in pre-Revolutionary France." },
  { title: "One Flew Over the Cuckoo's Nest", theatre: "Trafalgar Theatre", address: "14 Whitehall, London SW1A 2DY", genre: "Drama", overview: "A free-spirited new arrival challenges the iron rule of Nurse Ratched on a psychiatric ward in this powerful adaptation of Ken Kesey's novel." },
  { title: "The Lives of Others", theatre: "Adelphi Theatre", address: "Strand, London WC2R 0NS", genre: "Drama", overview: "Keira Knightley stars in Robert Icke's stage adaptation of the Oscar-winning film about surveillance, conscience and complicity in 1980s East Berlin." },
  { title: "Cyrano de Bergerac", theatre: "Noël Coward Theatre", address: "85-88 St Martin's Ln, London WC2N 4AU", genre: "Drama", overview: "A dazzling, self-conscious soldier-poet woos the woman he loves on another man's behalf in this fresh, verse-driven take on Rostand's romance." },
  { title: "The Misanthrope", theatre: "Lyttelton Theatre, National Theatre", address: "Upper Ground, South Bank, London SE1 9PX", genre: "Comedy", overview: "Molière's biting satire skewers hypocrisy and social vanity through a truth-telling cynic who finds himself hopelessly in love at court." },
  { title: "Bacchae", theatre: "Olivier Theatre, National Theatre", address: "Upper Ground, South Bank, London SE1 9PX", genre: "Drama", overview: "Euripides' visceral Greek tragedy unleashes the god Dionysus on the city of Thebes, where denial of his power brings savage, ecstatic destruction." },
  { title: "Man and Boy", theatre: "Dorfman Theatre, National Theatre", address: "Upper Ground, South Bank, London SE1 9PX", genre: "Drama", overview: "Terence Rattigan's drama traces a ruthless financier seeking shelter with his estranged son as his empire teeters on the brink of ruin." },
  { title: "The Oresteia", theatre: "Bridge Theatre", address: "3 Potters Fields Park, London SE1 2SG", genre: "Drama", overview: "Simon Stone's bold modern reworking of Aeschylus traps a contemporary family inside a Greek myth, starring Mary-Louise Parker and David Morrissey." },
  { title: "Arcadia", theatre: "The Old Vic", address: "The Cut, Lambeth, London SE1 8NB", genre: "Play", overview: "Tom Stoppard's dazzling masterpiece weaves between a 19th-century country house and the present day in a witty meditation on science, art and love." },
  { title: "Mary Page Marlowe", theatre: "The Old Vic", address: "The Cut, Lambeth, London SE1 8NB", genre: "Drama", overview: "Tracy Letts charts one ordinary woman's life out of sequence, with different actors revealing the choices and chances that shape a single existence." },
  { title: "The Guilty", theatre: "Donmar Warehouse", address: "41 Earlham St, Seven Dials, London WC2H 9LX", genre: "Thriller", overview: "Russell Tovey stars in Chloë Moss's new thriller directed by Punchdrunk's Felix Barrett, a tense single-location drama over one fraught emergency call." },
  { title: "The Maids", theatre: "Donmar Warehouse", address: "41 Earlham St, Seven Dials, London WC2H 9LX", genre: "Drama", overview: "Jean Genet's claustrophobic chamber piece follows two servants who act out twisted fantasies of murdering their mistress in a dangerous game of role-play." },
  { title: "A Doll's House", theatre: "Almeida Theatre", address: "Almeida St, Islington, London N1 1TA", genre: "Drama", overview: "Ibsen's landmark drama follows Nora as she awakens to the suffocating constraints of her marriage and dares to imagine a life of her own." },
  { title: "Under the Shadow", theatre: "Almeida Theatre", address: "Almeida St, Islington, London N1 1TA", genre: "Thriller", overview: "A psychological thriller starring Leila Farzad, adapted from the acclaimed horror film set against the backdrop of war-torn 1980s Tehran." },
  { title: "Archduke", theatre: "Royal Court Theatre", address: "Sloane Square, London SW1W 8AS", genre: "Comedy", overview: "Lyndsey Turner directs the UK premiere of Rajiv Joseph's dark comedy about the consumptive young men who assassinated Archduke Franz Ferdinand." },
  { title: "1536", theatre: "Ambassadors Theatre", address: "West St, London WC2H 9ND", genre: "Drama", overview: "Ava Pickett's acclaimed Tudor drama follows three Essex women whose lives are upended by the rumours swirling around Anne Boleyn's downfall." },
  { title: "Much Ado About Nothing", theatre: "Shakespeare's Globe", address: "21 New Globe Walk, London SE1 9DT", genre: "Shakespeare", overview: "Shakespeare's sparkling comedy pits sparring wits Beatrice and Benedick against each other amid deception, scandal and the giddy machinery of love." },
  { title: "A Midsummer Night's Dream", theatre: "Regent's Park Open Air Theatre", address: "Inner Circle, Regent's Park, London NW1 4NU", genre: "Shakespeare", overview: "Lovers, fairies and bumbling players collide in an enchanted wood in Shakespeare's most magical comedy, staged beneath the open summer sky." },
  { title: "Love's Labour's Lost", theatre: "Shakespeare's Globe", address: "21 New Globe Walk, London SE1 9DT", genre: "Shakespeare", overview: "Four young men swear off women to pursue study, only for love to upend their vows when a princess and her ladies arrive in this witty comedy." },
  { title: "Abigail's Party", theatre: "Richmond Theatre", address: "The Green, Richmond TW9 1QJ", genre: "Comedy", overview: "Mike Leigh's excruciatingly funny suburban classic skewers 1970s social aspiration over cheese-pineapple sticks and ever-flowing drinks at a doomed soirée." },
  { title: "Cleansed", theatre: "Almeida Theatre", address: "Almeida St, Islington, London N1 1TA", genre: "Drama", overview: "Rebecca Frecknall directs a rare, brutal revival of Sarah Kane's masterpiece exploring the violence of desire and what survives of love when nothing else remains." },
  { title: "The Truth", theatre: "Wyndham's Theatre", address: "32-36 Charing Cross Rd, London WC2H 0DA", genre: "Comedy", overview: "Christopher Hampton's translation of Florian Zeller's farce of marital deception arrives with Stephen Mangan, Ardal O'Hanlon, Sarah Hadland and Janie Dee." },
  { title: "Man to Man", theatre: "Royal Court Theatre", address: "Sloane Square, London SW1W 8AS", genre: "Drama", overview: "Tilda Swinton returns to the British stage in this solo tour de force about a woman who assumes her dead husband's identity to survive in Nazi-era Germany." },
  { title: "The Hunger Games: On Stage", theatre: "Troubadour Canary Wharf Theatre", address: "10 Upper Bank St, London E14 5NP", genre: "Drama", overview: "Suzanne Collins's dystopian saga is staged in immersive spectacle as Katniss Everdeen fights to survive the deadly, televised Hunger Games of Panem." },
  { title: "Backstroke", theatre: "Donmar Warehouse", address: "41 Earlham St, Seven Dials, London WC2H 9LX", genre: "Drama", overview: "A raw, tender two-hander explores a fraught mother-daughter relationship as past and present surface at a hospital bedside in a moment of crisis." },
  { title: "Dealer's Choice", theatre: "Donmar Warehouse", address: "41 Earlham St, Seven Dials, London WC2H 9LX", genre: "Comedy", overview: "Patrick Marber's whip-smart debut gathers a restaurant crew for a weekly poker night where money, power and fragile loyalties are all dealt out." },
  { title: "The Woman in Black", theatre: "Alexandra Palace Theatre", address: "Alexandra Palace Way, London N22 7AY", genre: "Thriller", overview: "The chilling stage classic as a lawyer recounts a haunting encounter with a vengeful spectre, building to one of theatre's great scares." },
  { title: "Golden Boy", theatre: "Almeida Theatre", address: "Almeida St, Islington, London N1 1TA", genre: "Play", overview: "Josh O'Connor leads Clifford Odets' Depression-era drama about a young man torn between the violin and the boxing ring in pursuit of success." },
  { title: "A Month in the Country", theatre: "Donmar Warehouse", address: "41 Earlham St, Seven Dials, London WC2H 9LX", genre: "Play", overview: "Lyndsey Turner directs a major revival of Brian Friel's version of Turgenev, a bittersweet study of love, longing and idleness on a Russian country estate." },
  { title: "Ilford Boy", theatre: "Donmar Warehouse", address: "41 Earlham St, Seven Dials, London WC2H 9LX", genre: "New writing", overview: "Danny Lee Wynter's world-premiere coming-of-age drama follows mixed-race teenager Ted Martin growing up in 1990s East London." },
  { title: "Eurotrash", theatre: "Young Vic", address: "66 The Cut, Lambeth, London SE1 8LZ", genre: "Play", overview: "Ben Whishaw and Kathryn Hunter play a mother and son road-tripping through the Swiss Alps to give away a fortune in this English-language premiere." },
  { title: "Springwood", theatre: "Hampstead Theatre", address: "Eton Avenue, Swiss Cottage, London NW3 3EU", genre: "New writing", overview: "Richard Nelson's world premiere, marking Stanley Tucci's London directing debut, dramatises a 1939 meeting between the US President and the British King and Queen." },
  { title: "Stage Kiss", theatre: "Hampstead Theatre", address: "Eton Avenue, Swiss Cottage, London NW3 3EU", genre: "Comedy", overview: "The UK premiere of Sarah Ruhl's romantic comedy follows former lovers reunited onstage who blur the line between acting and real-life passion." },
  { title: "We Had a World", theatre: "Hampstead Theatre", address: "Eton Avenue, Swiss Cottage, London NW3 3EU", genre: "Play", overview: "The European premiere of Joshua Harmon's autobiographical play examines three generations of a family across memory, inheritance and loss." },
  { title: "Tao of Glass", theatre: "@sohoplace", address: "4 Soho Place, London W1D 3BG", genre: "New writing", overview: "Phelim McDermott and Philip Glass collaborate on ten meditations on life, death and Taoist wisdom set to ten brand-new pieces of music." },
  { title: "Driftwood", theatre: "Kiln Theatre", address: "269 Kilburn High Road, London NW6 7JR", genre: "Play", overview: "The London premiere of this RSC production, led by Martina Laird, brings a tender, lyrical new drama to north London's Kilburn stage." },
  { title: "Table 17", theatre: "Kiln Theatre", address: "269 Kilburn High Road, London NW6 7JR", genre: "Comedy", overview: "Douglas Lyons' new comedy reunites two ex-fiancés at a restaurant for the first time in two years, sparking a bittersweet reckoning." },
  { title: "Nine Night", theatre: "Kiln Theatre", address: "269 Kilburn High Road, London NW6 7JR", genre: "Play", overview: "Amit Sharma directs a revival of Natasha Gordon's award-winning play about three generations of a London family gathered for a traditional Jamaican wake." },
  { title: "The Afronauts", theatre: "Royal Court Theatre", address: "Sloane Square, London SW1W 8AS", genre: "New writing", overview: "Ryan Calais Cameron's epic new drama imagines the audacious story of the 1960s Zambian space race to beat America and Russia to the moon." },
  { title: "Tender", theatre: "Bush Theatre", address: "7 Uxbridge Road, Shepherd's Bush, London W12 8LJ", genre: "New writing", overview: "Eleanor Tindall's surreal, sold-out queer love story returns upscaled, a tale of intimacy, memory and fragile moments." },

  // ---- Dance & Opera ---------------------------------------------------
  { title: "Matthew Bourne's The Car Man", theatre: "Sadler's Wells", address: "Rosebery Avenue, Clerkenwell, London EC1R 4TN", genre: "Dance", overview: "Bourne's multi-award-winning dance thriller relocates Bizet's Carmen to a steamy 1950s American garage-diner consumed by lust, greed and revenge." },
  { title: "Alvin Ailey American Dance Theater", theatre: "Sadler's Wells", address: "Rosebery Avenue, Clerkenwell, London EC1R 4TN", genre: "Dance", overview: "The legendary American company returns with legacy works and new choreography, including the ever-electrifying signature piece Revelations." },
  { title: "San Francisco Ballet — Mere Mortals", theatre: "Sadler's Wells", address: "Rosebery Avenue, Clerkenwell, London EC1R 4TN", genre: "Dance", overview: "San Francisco Ballet brings its visually arresting reimagining of the Pandora's box myth, fusing classical ballet with an electronic score and digital design." },
  { title: "I puritani", theatre: "Royal Opera House", address: "Bow Street, Covent Garden, London WC2E 9DD", genre: "Opera", overview: "Lisette Oropesa takes on Bellini's dazzling coloratura role of Elvira in this staging of love and madness amid the English Civil War." },
  { title: "La Fille du régiment", theatre: "Royal Opera House", address: "Bow Street, Covent Garden, London WC2E 9DD", genre: "Opera", overview: "Laurent Pelly's exuberant production of Donizetti's comic opera, with Juan Diego Flórez, brings military life in the Tyrolean Alps vividly to the stage." },
  { title: "Sherlock Holmes", theatre: "Regent's Park Open Air Theatre", address: "Inner Circle, Regent's Park, London NW1 4NU", genre: "Play", overview: "A world-premiere mystery transports audiences to Victorian London for a thrilling open-air chase packed with danger, deduction and intrigue." },
];

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Derive id (unique slug) + accent (rotating hue so the stubs stay varied).
export const SHOWS: Show[] = (() => {
  const seen = new Set<string>();
  return RAW.map((s, i) => {
    let id = slugify(s.title);
    while (seen.has(id)) id += `-${i}`;
    seen.add(id);
    const hue = (i * 47) % 360; // golden-ish step keeps neighbours distinct
    return {
      ...s,
      id,
      city: "London",
      accent: `oklch(0.6 0.095 ${hue})`,
    };
  });
})();

/** Look up a single show by id. */
export function getShow(id: string): Show | undefined {
  return SHOWS.find((s) => s.id === id);
}

/** Case-insensitive search across title, theatre, genre, and overview. */
export function searchShows(query: string): Show[] {
  const q = query.trim().toLowerCase();
  if (!q) return SHOWS;
  return SHOWS.filter((s) =>
    [s.title, s.theatre, s.city, s.genre, s.overview]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
}
