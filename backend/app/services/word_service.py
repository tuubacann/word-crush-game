from app.database import words_collection

LETTER_SCORES = {
    "A": 1, "B": 3, "C": 4, "Ç": 4, "D": 3, "E": 1,
    "F": 7, "G": 5, "Ğ": 8, "H": 5, "I": 2, "İ": 1,
    "J": 10, "K": 1, "L": 1, "M": 2, "N": 1, "O": 2,
    "Ö": 7, "P": 5, "R": 1, "S": 2, "Ş": 4, "T": 1,
    "U": 2, "Ü": 3, "V": 7, "Y": 3, "Z": 4
}


def normalize_word(word: str):
    return word.strip().upper()


def calculate_score(word: str):
    total = 0

    for letter in word:
        total += LETTER_SCORES.get(letter, 0)

    return total


def word_exists(word: str):
    return words_collection.find_one({"word": word}) is not None


def find_combos(word: str):
    combos = set()

    for i in range(len(word)):
        for j in range(i + 3, len(word) + 1):
            sub_word = word[i:j]

            if sub_word != word and word_exists(sub_word):
                combos.add(sub_word)

    return list(combos)


def check_word(word: str):
    word = normalize_word(word)

    if len(word) < 3:
        return {
            "valid": False,
            "message": "Word must be at least 3 letters",
            "score": 0,
            "combos": [],
            "combo_score": 0,
            "total_score": 0
        }

    if not word_exists(word):
        return {
            "valid": False,
            "message": "Word not found in dictionary",
            "score": 0,
            "combos": [],
            "combo_score": 0,
            "total_score": 0
        }

    score = calculate_score(word)
    combos = find_combos(word)

    combo_score = 0
    for combo in combos:
        combo_score += calculate_score(combo)

    total_score = score + combo_score

    return {
        "valid": True,
        "message": "Word accepted",
        "word": word,
        "score": score,
        "combos": combos,
        "combo_score": combo_score,
        "total_score": total_score
    }