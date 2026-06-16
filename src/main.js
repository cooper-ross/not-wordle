const ROWS = 8;
const COLUMNS = 18;
const FLIP_DELAY = 220;
const FLIP_DURATION = 600;
const VALID_LETTERS = "qwertyuiopasdfghjklzxcvbnm";

const KEYBOARD_LAYOUT = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["Enter", "z", "x", "c", "v", "b", "n", "m", "Backspace"]
];

const STATUS_PRIORITY = { correct: 3, partial: 2, incorrect: 1 };
var curr = { row: 0, col: 0 };
var locked = false;

const WORDS = [
    "transmogrification",
].filter(w => w.length === COLUMNS);

const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)].split("");

let word = pick();

const setup = () => {
    const $board = $("#game-board");
    for (let row = 0; row < ROWS; ++row) {
        $board.append(`<div id="game-row-${row}" class="game-row"></div>`);
        for (let col = 0; col < COLUMNS; ++col) {
            $(`#game-row-${row}`).append(`<div id="${row}-${col}" class="letter empty"></div>`);
        }
    }
};

const add = (letter) => {
    if (curr.col == COLUMNS || curr.row == ROWS) return;
    const $tile = $(`#${curr.row}-${curr.col++}`);

    $tile.removeClass("current");
    $tile.html(letter).addClass("current");
};

const remove = () => {
    if (curr.col == 0) return;
    $(`#${curr.row}-${--curr.col}`).html("").removeClass("current");
};

const handle = (key) => {
    if (locked) return;

    const $key = $(`.kb-key[data-key="${key}"]`);
    if ($key.length) {
        $key.addClass("kb-pressed");
        setTimeout(() => $key.removeClass("kb-pressed"), 120);
    }

    if (key === "Backspace") remove();
    if (key === "Enter") verify();
    if (VALID_LETTERS.includes(key.toLowerCase())) {
        add(key.toLowerCase());
    }
};

const keyboard = () => {
    const $kb = $("#keyboard");
    KEYBOARD_LAYOUT.forEach(row => {
        const $row = $(`<div class="kb-row"></div>`);
        row.forEach(key => {
            const label = key === "Backspace" ? "⌫" : key; // U+232B
            const wide = (key === "Enter" || key === "Backspace") ? " kb-wide" : "";
            $row.append(`<button type="button" class="kb-key${wide}" data-key="${key}">${label}</button>`);
        });
        $kb.append($row);
    });
    $kb.on("click", ".kb-key", function(e) {
        e.preventDefault();
        handle($(this).data("key"));
        this.blur();
    });
};

const input = () => {
    $(document).on("keydown", function(e) {
        handle(e.key);
    });
};

const updateKeyColor = (letter, status) => {
    const $key = $(`.kb-key[data-key="${letter}"]`);
    if (!$key.length) return;
    const currStatus = $key.attr("data-status");
    if (!currStatus || STATUS_PRIORITY[status] > STATUS_PRIORITY[currStatus]) {
        $key.attr("data-status", status);
        $key.removeClass("kb-correct kb-partial kb-incorrect").addClass(`kb-${status}`);
    }
};

const shake = () => {
    const $row = $(`#game-row-${curr.row}`);
    $row.removeClass("shake");
    void $row[0].offsetWidth;
    $row.addClass("shake");
    setTimeout(() => $row.removeClass("shake"), 500);
};

const verify = () => {
    if (locked) return;
    if (curr.col != COLUMNS) return shake();
    locked = true;

    const $row = $(`#game-row-${curr.row}`);
    const submitted = $row.children().map((_, c) => $(c).text()).get();

    // two-pass method (to handle duplicate letters correctly)
    const remaining = word.slice();
    const statuses = [];

    for (let col = 0; col < COLUMNS; ++col) {
        if (submitted[col] === word[col]) {
            statuses[col] = "correct";
            const idx = remaining.indexOf(word[col]);
            if (idx > -1) remaining.splice(idx, 1);
        }
    }
    for (let col = 0; col < COLUMNS; ++col) {
        if (statuses[col] === "correct") continue;
        const idx = remaining.indexOf(submitted[col]);
        if (idx > -1) {
            statuses[col] = "partial";
            remaining.splice(idx, 1);
        } else {
            statuses[col] = "incorrect";
        }
    }

    // lovely staggered flip-reveal
    statuses.forEach((status, col) => {
        const $tile = $(`#${curr.row}-${col}`);
        setTimeout(() => {
            $tile.addClass("flip");
            setTimeout(() => {
                $tile.removeClass("empty current").addClass(status);
                updateKeyColor(submitted[col], status);
            }, FLIP_DURATION / 2);
            setTimeout(() => $tile.removeClass("flip"), FLIP_DURATION);
        }, col * FLIP_DELAY);
    });

    const totalTime = (COLUMNS - 1) * FLIP_DELAY + FLIP_DURATION;
    setTimeout(() => {
        if (remaining.length === 0) return success();
        if (curr.row === ROWS - 1) return failure();
        curr.row++;
        curr.col = 0;
        locked = false;
    }, totalTime);
};

const dance = () => {
    for (let col = 0; col < COLUMNS; ++col) {
        const $tile = $(`#${curr.row}-${col}`);
        setTimeout(() => {
            $tile.addClass("bounce");
            setTimeout(() => $tile.removeClass("bounce"), 800);
        }, col * 100);
    }
};

const fireConfettiShow = () => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    confetti({ position: { x: 0, y: H / 2 }, count: 160, velocity: 400, fade: false });
    confetti({ position: { x: W, y: H / 2 }, count: 160, velocity: 400, fade: false });
    setTimeout(() => confetti({ position: { x: W / 2, y: 0 }, count: 200, velocity: 450, fade: false }), 350);
    setTimeout(() => confetti({ position: { x: W * 0.25, y: H * 0.3 }, count: 90, velocity: 320, fade: true }), 800);
    setTimeout(() => confetti({ position: { x: W * 0.75, y: H * 0.3 }, count: 90, velocity: 320, fade: true }), 800);
};

const success = () => {
    dance();
    fireConfettiShow();
    setTimeout(() => popup(true, curr.row + 1), 1100);
};

const failure = () => {
    $("body").addClass("loss-flash");
    setTimeout(() => $("body").removeClass("loss-flash"), 600);
    setTimeout(() => popup(false, 0), 700);
};

const popup = (won, score) => {
    const $value = $("#popup-score-value");
    $("#popup-score-max").text(ROWS);
    $value.text(won ? score : "—");

    if (won) {
        $("#popup-title").text("Congratulations!");
        const subtitle = score == 1 ? "How did you do that?!" : `You solved it in ${score} guess${score === 1 ? "" : "es"}.`;
        $("#popup-subtitle").text(subtitle);
        $value.removeClass("lost");
    } else {
        $("#popup-title").text("Better luck next time!");
        $("#popup-subtitle").text(`The word was "${word.join("")}".`);
        $value.addClass("lost");
    }

    $("#popup-redo").prop("disabled", false);
    $("#popup-new").prop("disabled", false);

    setTimeout(() => $("#popup-overlay").removeClass("hidden"), 400);
};

const clearBoard = () => {
    for (let row = 0; row < ROWS; ++row) {
        for (let col = 0; col < COLUMNS; ++col) {
            $(`#${row}-${col}`).html("").removeClass("correct partial incorrect current flip bounce").addClass("empty");
        }
    }
    $(".kb-key").removeClass("kb-correct kb-partial kb-incorrect kb-pressed").removeAttr("data-status");
};

const closePopup = () => {
    $("#popup-redo").prop("disabled", true);
    $("#popup-new").prop("disabled", true);
    $("#popup-overlay").addClass("hidden");
};

const redo = () => {
    closePopup();
    curr.row = 0;
    curr.col = 0;
    locked = false;
    clearBoard();
};

const start = () => {
    word = pick();
    redo();
};

const onready = () => {
    setup();
    keyboard();
    input();

    $("#popup-redo").on("click", redo);
    $("#popup-new").on("click", start);
};

$(document).ready(onready);