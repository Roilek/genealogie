// URL de votre Google Sheet publiée en CSV
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQcbHKoB5yA8sEHw8J7b_klXHhbwzc2hGSxXxgLv7L7tX8e4fQw2ck1k6GnOKit-y2rDgPhOoe5Yfdk/pub?gid=1914572086&single=true&output=csv";

let _input = null; // sera rempli après le fetch

function loadFamilyData() {
	return fetch(CSV_URL)
		.then(response => response.text())
		.then(csvText => {
			// Découpage des lignes, gestion CRLF
			const rawLines = csvText.trim().split(/\r?\n/);
			if (!rawLines.length) {
				throw new Error("CSV vide ou illisible");
			}

			// Détection du séparateur : ',' ou ';'
			const sep = rawLines[0].includes(";") ? ";" : ",";

			const rows = rawLines.map(line => line.split(sep));

			const header = rows[0].map(h => h.trim());
			const dataRows = rows.slice(1);

			const idx = (colName) => {
				const i = header.indexOf(colName);
				if (i === -1) {
					console.warn(`Colonne manquante dans le CSV : "${colName}"`);
				}
				return i;
			};

			const idIdx = idx("id");
			const nameIdx = idx("Nom complet");
			const birthIdx = idx("Date de naissance");
			const deathIdx = idx("datededeces");
			const photoIdx = idx("Photo code");
			const unionIdx = idx("Union");
			const childUnionIdx = idx("Issu de");

			const members = {};
			const unions = {}; // unionKey -> [idParent1, idParent2, ...]
			const links = [];

			// 1) Construire les members et les unions (couples)
			dataRows.forEach(row => {
				if (!row || row.join("").trim() === "") return;

				const id = idIdx >= 0 ? (row[idIdx] || "").trim() : "";
				if (!id) return;

				const name = nameIdx >= 0 ? (row[nameIdx] || "").trim() : "";
				const birth_date = birthIdx >= 0 ? (row[birthIdx] || "").trim() : "";
				const death_date = deathIdx >= 0 ? (row[deathIdx] || "").trim() : "";
				const image_path = photoIdx >= 0 ? (row[photoIdx] || "").trim() : "images/Donklopopi Frosch 1982.jpg";

				// Member
				members[id] = {
					name,
					birth_date,
					death_date,
					image_path
				};

				// Si la personne fait partie d'un couple (Union),
				// on stocke ça dans unions
				if (unionIdx >= 0) {
					const union_key = (row[unionIdx] || "").trim();
					if (union_key) {
						if (!unions[union_key]) {
							unions[union_key] = [];
						}
						if (!unions[union_key].includes(id)) {
							unions[union_key].push(id);
						}
					}
				}
			});

			// 2) Générer les links à partir des unions (couples + enfants)

			// a) liens "parent" -> "union" (ex: "29" -> "U500")
			Object.entries(unions).forEach(([unionKey, membersOfUnion]) => {
				membersOfUnion.forEach(personId => {
					links.push([personId, unionKey]);
				});
			});

			// b) liens "union" -> "enfant" à partir de "Enfant de l'union"
			if (childUnionIdx >= 0) {
				dataRows.forEach(row => {
					if (!row || row.join("").trim() === "") return;

					const id = idIdx >= 0 ? (row[idIdx] || "").trim() : "";
					if (!id) return;

					const child_of_union = (row[childUnionIdx] || "").trim();
					if (!child_of_union) return;

					const parents = unions[child_of_union];
					if (parents && parents.length) {
						links.push([child_of_union, id]); // U500 -> enfant
					}
				});
			}

			// 3) Trouver un point de départ pour l'arbre
			// Ici : la première union (ex: "U500")
			const firstUnionKey = Object.keys(unions)[0];
			const start = "26-27";

			_input = {
				start,
				members,
				links
			};

			console.log("INPUT", _input);
			return _input;
		});
}