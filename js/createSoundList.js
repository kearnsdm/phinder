var lines = new Array();
var lines2 = new Array();
var soundLetters = new Array();
var allSounds = new Array();
var soundLet;
var soundCod;
var matchingLetters = new Array();
var selectedLetters = new Array();

function removeButton(clicked_id, selected) {
    for (var i = 0; i < selected.length; i++) {
        if (clicked_id.indexOf(selected[i].gpc) > -1) {
            selectedLetters.splice(i,1);
            break;
        }
    }
}