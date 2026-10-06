/** PERSON 1 – Bewusst auswählbare Beispieldaten. Keine erfundenen Lernstände. */
export const demoDecks = [
  {
    name: 'Datenbanken verstehen', subject: 'Datenmanagement', description: 'Schlüssel, Beziehungen und SQL – die Grundlagen für dein erstes Semester.',
    cards: [
      ['Was ist ein Primärschlüssel?', 'Ein Attribut oder eine Attributkombination, die jeden Datensatz einer Tabelle eindeutig identifiziert. Werte sind eindeutig und dürfen nicht NULL sein.'],
      ['Wozu dient ein Fremdschlüssel?', 'Ein Fremdschlüssel verweist auf einen eindeutigen Schlüssel einer anderen oder derselben Tabelle und stellt eine Beziehung zwischen Datensätzen her.'],
      ['Was bedeutet die erste Normalform (1NF)?', 'Jeder Attributwert ist atomar. Es gibt keine Wiederholungsgruppen oder Listen mehrerer Werte in einem Feld.'],
      ['Wie wählst du alle Zeilen einer Tabelle namens kunden aus?', 'SELECT * FROM kunden;'],
      ['Was bedeutet eine 1:n-Beziehung?', 'Ein Datensatz der ersten Tabelle kann mit mehreren Datensätzen der zweiten verbunden sein. Jeder dieser Datensätze gehört höchstens einem Datensatz der ersten Tabelle.'],
    ],
  },
  {
    name: 'Logik & Mengen', subject: 'Mathematik', description: 'Quantoren, Mengenoperationen und Aussagen Schritt für Schritt festigen.',
    cards: [
      ['Was bedeutet der Allquantor ∀?', '„Für alle“: Die folgende Aussage gilt für jedes Element des angegebenen Bereichs.'],
      ['Wie verneinst du „Für alle x gilt P(x)“?', 'Es gibt mindestens ein x, für das P(x) nicht gilt: ¬∀x P(x) ⇔ ∃x ¬P(x).'],
      ['Was enthält die Schnittmenge A ∩ B?', 'Genau die Elemente, die sowohl in A als auch in B enthalten sind.'],
      ['Wann ist A ⇒ B falsch?', 'Nur wenn A wahr und B falsch ist.'],
      ['Was ist der ggT von 12 und 20?', '4. Euklidischer Algorithmus: 20 = 1·12 + 8; 12 = 1·8 + 4; 8 = 2·4 + 0.'],
    ],
  },
  {
    name: 'Java Basics', subject: 'Programmierung', description: 'Die wichtigsten Bausteine: Variablen, Arrays und Methoden.',
    cards: [
      ['Mit welchem Index beginnt ein Array in Java?', 'Mit 0. Bei Länge n ist der letzte gültige Index n − 1.'],
      ['Was unterscheidet int und double?', 'int speichert ganze Zahlen mit 32 Bit. double speichert Gleitkommazahlen mit 64 Bit und endlicher Genauigkeit.'],
      ['Was gibt System.out.println("ONKI") aus?', 'ONKI und anschließend einen Zeilenumbruch.'],
      ['Was bedeutet der Rückgabetyp void?', 'Die Methode liefert keinen Wert zurück.'],
      ['Wie vergleichst du den Inhalt zweier Strings?', 'Mit equals(), zum Beispiel text.equals("ONKI"). == vergleicht bei Referenztypen die Referenzen.'],
    ],
  },
];
