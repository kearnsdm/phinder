/*
 * Created by Miao on 3/18/14.
 */
var doc = document;
var lines = new Array();
var lines2 = new Array()
var soundCodes = new Array();
var ipa = new Array();
var soundLetters = new Array();
var allSounds = new Array();
var matchingLetters = new Array();
var selectedLetters = new Array();
var selectedLetters2 = new Array();
var selectedLetters3 = new Array();
var ipaMatch = new Array();
var soundMatch = new Array();
var wordMatch = new Array();
var patterns = new Array();
var uniqueLetters = new Array();
var ipaFlag = true;
var alphaDes = false;
var freqDes = true;
var ipaSearch = true;
var soundSearch = false;
var advancedSearch = false;
var combine = false;
var selected = 1;
var buttonTypes = new Array();

$(function() {
    $('.refmodal').tooltip();
    $('.only').tooltip();
    $('.help').tooltip();
    $('#combination').tooltip();
});

// starts angularjs and has a directive that resets the button after searching is finished
var app = angular.module('angularjs-starter', [])
    .directive('mySearchDirective', function() {
        return function(scope, element, attrs) {
            if (scope.$last){
                $('#searching').button('reset');
            }
        };
    })
    .directive('myRemoveDirective', function() {
        return function(scope, element, attrs) {
                if (scope.$last){
                if (selectedLetters.length == 0) {
                    $('.glyphicon-remove').removeClass();
                }
            }
        };
    })
    .directive('myAddDirective', function() {
        return function(scope, element, attrs) {
            if (scope.$last){
                if (selected == 2) {
                    $('.selected2').prop('disabled', false);
                } else if (selected == 3) {
                    $('.selected3').prop('disabled', false);
                }
            }
        };
    })
    .directive('myConfirmDirective', function() {
        return function(scope, element, attrs) {
            if (scope.$last){
                if (selected == 2) {
                    $('.selected2').prop('disabled', false);
                } else if (selected == 3) {
                    $('.selected3').prop('disabled', false);
                }
            }
        };
    });

// set up controller
app.controller('gpcCtrl', function($scope) {
    $(document).ready(function() {
        // load SoundList.txt and create the list for all sound patterns when document is ready
        $.get('SoundList.txt', function(data) {
            lines = data.split('\n');
            lines.forEach(function(value) {
                soundLetters.push(value.substring(0,value.indexOf("[")));
                allSounds.push(value.substring(value.indexOf("[")+1,value.indexOf("]")));
            });

            // only use unique letters
            uniqueLetters = [];
            $.each(soundLetters, function(i, el){
                if($.inArray(el, uniqueLetters) === -1) uniqueLetters.push(el);
            });

            $scope.addPatterns();
        }, 'text');

        // load Sound_IPA_List.txt and create the lists for all sound codes and IPAs when document is ready
        $.get('Sound_IPA_List.txt', function(data) {
            lines2 = data.split('\n');
            lines2.forEach(function(value) {
                var split = value.split("\t");
                soundCodes.push({code:split[0], one:split[1], two:split[2], three:split[3], four: split[4], five:split[5]});
                ipa.push({code:split[0], one:split[6], two:split[7], three:split[8]});
            });
        }, 'text');

        // search by IPA or Sound Code, activates one button and inactivates the other
        $("#gpcs > #gpc").click(function(){
            $("#gpcs > #gpc").removeClass("active");
            $(this).addClass("active");
        });
    });

    $scope.listLength = 0;
    $scope.defPatterns = ["a", "ar", "ck", "e", "ea", "ee", "igh", "i_e", "k", "m", "oa", "ow", "qu", "x", "y", "..."];
    $scope.patterns = ["a","aa","ae","ah","ai","ais","ait","al","alf","anc","and","ang","ao","aoh","at","au","aw","ay","b","bb","c","cc","ch","chm","chs","cht","ci","ck","cz","d","dd","dg","dge","dj","e","ea","eau","eaux","ee","eh","ei","em","en","ent","eo","es","et","eu","ew","ey","eye","ez","f","ff","g","gg","gh","gm","h","hu","i","ia","ie","ieu","io","iou","is","iu","j","ju","k","kh","kk","kn","l","ll","m","mm","mn","mp","mps","n","nc","nd","ng","nn","o","oa","oe","oeu","oh","oi","oid","oint","ois","ol","olo","ont","oo","ot","ou","ough","oul","oup","oux","ow","oy","p","pf","ph","pht","pn","pp","ps","psh","pt","q","r","rps","rr","rrh","s","sc","sch","sh","ss","t","tch","th","ti","tsch","tsh","tt","u","ua","ue","uh","ui","uo","uoy","uy","v","vv","w","wai","wh","wo","wr","x","y","z","zz","'","+","_"];
    $scope.ipas = ["`","`r","a","A","A~","2","aI","A~n","a~n","aU","b","O","OI","O~n","d","D","dZ","e","@","@`","@m","@n","@r","E","3","3`","E@","f","g","gz","gZ","h","H","i","I","I@","j","ja","jO","je","j@","jE","j3","jo","ju","jU","jU@","k","ks","kS","kz","l","l=","m","m=","n","n=","N","o","T","p","r","4","R","s","S","t","ts","tS","u","U","U@","v","V","w","hw","wa","wA","waI","w@","wi","wV","x","jA","z","Z","_"];
    $scope.wordMatch = [{word:" "}, {word:" "}, {word:" "}, {word:" "}, {word:" "}, {word:" "}, {word:" "}, {word:" "}, {word:" "}, {word:" "}];
    $scope.matchingLetters = [];
    $scope.ipaMatch = [];
    $scope.soundMatch = [];
    $scope.sounds = [];
    $scope.selectedLetters = [];
    $scope.selectedLetters2 = [];
    $scope.selectedLetters3 = [];
    var matchingLetters = [];
    var ipaMatch = [];
    var soundMatch = [];
    $scope.spellingCombine1 = {display: " "};
    $scope.spellingCombine2 = {display: " "};
    $scope.spellingCombine3 = {display: " "};
    $scope.combination = {display: " "};
    $scope.combined = false;
    $scope.combine1 = false;
    $scope.combine2 = false;
    $scope.combine3 = false;

    // default letter pattern grid
    $scope.defPatternRows = [];
    var maxRows = 4;
    var maxCols = 39;
    var count = 0;
    for( var i = 0 ; i < maxRows;i++){
        $scope.defPatternRows.push([]);
        for( var j = 0 ; j < maxCols;j++){
            $scope.defPatternRows[i][j] = $scope.defPatterns[count];
            count++;
        }
    }

    // letter pattern grid
    $scope.patternRows = [];
    var maxRows = 4;
    var maxCols = 4;
    var count = 0;
    for( var i = 0 ; i < maxRows;i++){
        $scope.patternRows.push([]);
        for( var j = 0 ; j < maxCols;j++){
            $scope.patternRows[i][j] = $scope.patterns[count];
            count++;
        }
    }

    // phoneme grid
    $scope.phonemeRows = [];
    maxRows = 3;
    maxCols = 4;
    count = 0;
    for( var i = 0 ; i < maxRows;i++){
        $scope.phonemeRows.push([]);
        for( var j = 0 ; j < maxCols;j++){
            $scope.phonemeRows[i][j] = {sound:" "};
            count++;
        }
    }

    /*
     * add letter patterns
     */
    $scope.addPatterns = function() {
        if (uniqueLetters.length > 2) {
            $scope.patterns = uniqueLetters;
        }
    };

    /*
     * option to choose IPA or Sound Code
     */
    $scope.choosePattern = function(clickEvent) {
        matchingLetters = [];
        ipaMatch = [];
        soundMatch = [];

        lines.forEach(function(value, index) {

            if (clickEvent.target.innerHTML == soundLetters[index]) {
                matchingLetters.push({code:clickEvent.target.innerHTML, gpc:value.substring(value.indexOf("[")+1,value.indexOf("]"))});
            }
        });

        matchingLetters.forEach(function(value, index) {
            ipa.forEach(function(v, i) {
                if (value.gpc == v.code && value.gpc != "") {
                    ipaMatch[index] = {code:value.code, sound:"/"+ String.fromCharCode(parseInt(v.one, 16)) + String.fromCharCode(parseInt(v.two, 16)) + String.fromCharCode(parseInt(v.three, 16))+"/", gpc:value.code+"["+value.gpc+"]"};
                }

                if (value.gpc == "") {
                    ipaMatch[index] = {code:value.code, sound: "/ /", gpc:value.code+"["+value.gpc+"]"};
                }
            });

            soundCodes.forEach(function(v, i) {
                if (value.gpc == v.code && value.gpc != "") {
                    soundMatch[index] = {code:value.code, sound:"/"+ String.fromCharCode(parseInt(v.one, 16)) + String.fromCharCode(parseInt(v.two, 16)) + String.fromCharCode(parseInt(v.three, 16)) + String.fromCharCode(parseInt(v.four, 16)) + String.fromCharCode(parseInt(v.five, 16)) + "/", gpc:value.code+"["+value.gpc+"]"};
                }

                if (value.gpc == "") {
                    soundMatch[index] = {code:value.code, sound: "/ /", gpc:value.code+"["+value.gpc+"]"};
                }
            });
        });

        if (!ipaFlag) {
            $scope.sounds = ipaMatch;
        } else {
            $scope.sounds = soundMatch;
        }

        // update phoneme grid
        $scope.phonemeRows = [];
        maxRows = 3;
        maxCols = 4;
        count = 0;
        for( var i = 0 ; i < maxRows;i++){
            $scope.phonemeRows.push([]);
            for( var j = 0 ; j < maxCols;j++){
                if (count >= $scope.sounds.length) {
                    $scope.phonemeRows[i][j] = {code:" ", sound:" ", gpc:" "};
                } else {
                    $scope.phonemeRows[i][j] = $scope.sounds[count];
                }
                count++;
            }
        }
    }

    /*
     * add and display IPAs
     */
    $scope.addIPAs = function(){
        ipaFlag = false;
        $scope.sounds = ipaMatch;

        // update phoneme grid
        $scope.phonemeRows = [];
        maxRows = 3;
        maxCols = 4;
        count = 0;
        for( var i = 0 ; i < maxRows;i++){
            $scope.phonemeRows.push([]);
            for( var j = 0 ; j < maxCols;j++){
                if (count >= $scope.sounds.length) {
                    $scope.phonemeRows[i][j] = {code:" ", sound:" ", gpc:" "};
                } else {
                    $scope.phonemeRows[i][j] = $scope.sounds[count];
                }
                count++;
            }
        }
    };

    /*
     * add and display Sound Codes
     */
    $scope.addSoundCodes = function() {
        ipaFlag = true;
        $scope.sounds = soundMatch;

        // update phoneme grid
        $scope.phonemeRows = [];
        maxRows = 3;
        maxCols = 4;
        count = 0;
        for( var i = 0 ; i < maxRows;i++){
            $scope.phonemeRows.push([]);
            for( var j = 0 ; j < maxCols;j++){
                if (count >= $scope.sounds.length) {
                    $scope.phonemeRows[i][j] = {code:" ", sound:" ", gpc:" "};
                } else {
                    $scope.phonemeRows[i][j] = $scope.sounds[count];
                }
                count++;
            }
        }
    }

    $scope.addSelected = function(clickedEvent) {
        if (combine) {
            $scope.addSelectedCombine(clickedEvent);
        } else {
            if (selected == 1) {
                $scope.addSelectedAux(clickedEvent, selectedLetters);
            } else if (selected == 2) {
                $scope.addSelectedAux(clickedEvent, selectedLetters2);
            } else if (selected == 3) {
                $scope.addSelectedAux(clickedEvent, selectedLetters3);
            }
        }

        buttonTypes.push("and");
        if ($scope.selectedLetters.length == 2) {
            $scope.combine1 = true;
        }

        if ($scope.selectedLetters.length == 3) {
            $scope.combine2 = true;
        }

        if ($scope.selectedLetters.length == 4) {
            $scope.combine3 = true;
        }
    }

    /*
     * add selected sound spellings
     */
    $scope.addSelectedAux = function(clickedEvent, selectedList){
        if (selectedList.length != 0) {
            if (selectedList[0].display == " ") {
                selectedList = [];
            }
        }

        var sel = clickedEvent.target.id.split(' ');
        var flag = true;

        if (selectedList.length == 0) {
            if (flag && (sel[1] == "/")) {
                selectedList.push({display:sel[0] + " = / /", gpc:sel[3], pattern:sel[0], phoneme:sel[1]});
            } else if (sel[0] == "") {
                return;
            } else {
                selectedList.push({display:sel[0] + " = " + sel[1], gpc:sel[2], pattern:sel[0], phoneme:sel[1]});
            }
        } else {
            for (var i = 0; i < selectedList.length; i++) {
                if (selectedList[i].gpc.indexOf(sel[2]) > -1) {
                    flag = false;
                }

                if (sel[1] == "/") {
                    if (selectedList[i].gpc.indexOf(sel[3]) > -1) {
                        flag = false;
                    }
                }
            }

            if (flag && (sel[1] == "/")) {
                selectedList.push({display:sel[0] + " = / /", gpc:sel[3], pattern:sel[0], phoneme:sel[1]});
            } else if (sel[0] == "") {
                return;
            } else if (flag) {
                selectedList.push({display:sel[0] + " = " + sel[1], gpc:sel[2], pattern:sel[0], phoneme:sel[1]});
            }
        }

        if (selected == 1) {
            $scope.selectedLetters = selectedList;
            selectedLetters = selectedList;
        } else if (selected == 2) {
            $scope.selectedLetters2 = selectedList;
            selectedLetters2 = selectedList;
            $('.selected2').prop('disabled', false);
        } else if (selected == 3) {
            $scope.selectedLetters3 = selectedList;
            selectedLetters3 = selectedList;
            $('.selected3').prop('disabled', false);
        }
    };

    $scope.addSelectedCombine = function(clickedEvent){
        var sel = clickedEvent.target.id.split(' ');

        if ($scope.spellingCombine1.display == " ") {
            $scope.spellingCombine1 = {display:sel[0] + " = " + sel[1], gpc:sel[2], pattern:sel[0], phoneme:sel[1]};
        } else {
            $scope.spellingCombine2 = {display:sel[0] + " = " + sel[1], gpc:sel[2], pattern:sel[0], phoneme:sel[1]};
        }
    };

    $scope.removeSelected = function(clickedEvent){
        if (clickedEvent.target.innerHTML.indexOf(" ") == 0 || clickedEvent.target.textContent == "    " || clickedEvent.target.textContent == "     " || (clickedEvent.target.textContent == "" && selectedLetters.length == 0)) {
            return;
        } else {
            if (selected == 1) {
                $scope.removeSelectedAux(clickedEvent, selectedLetters);
            } else if (selected == 2) {
                $scope.removeSelectedAux(clickedEvent, selectedLetters2);
            } else if (selected == 3) {
                $scope.removeSelectedAux(clickedEvent, selectedLetters3);
            }


            if ($scope.selectedLetters.length == 1) {
                $scope.combine1 = false;
                $scope.combine2 = false;
                $scope.combine3 = false;
            } else if ($scope.selectedLetters.length == 2) {
                $scope.combine1 = true;
                $scope.combine2 = false;
                $scope.combine3 = false;
            } else if ($scope.selectedLetters.length == 3) {
                $scope.combine1 = true;
                $scope.combine2 = true;
                $scope.combine3 = false;
            } else if ($scope.selectedLetters.length == 4) {
                $scope.combine1 = true;
                $scope.combine2 = true;
                $scope.combine3 = true;
            }
        }
    };

    /*
     * remove selected sound spelling
     */
    $scope.removeSelectedAux = function(clickedEvent, selectedList){
        for (var i = 0; i < selectedList.length; i++) {
            if (clickedEvent.target.id.indexOf(selectedList[i].gpc) > -1 || clickedEvent.target.offsetParent.id) {
                selectedList.splice(i,1);
                break;
            }
        }

        if (selected == 1) {
            $scope.selectedLetters = selectedList;
            selectedLetters = selectedList;

            if ($scope.selectedLetters.length == 0 && advancedSearch) {
                $scope.selectedLetters = [{display:" "}];
            }
        } else if (selected == 2) {
            $scope.selectedLetters2 = selectedList;
            selectedLetters2 = selectedList;

            if ($scope.selectedLetters2.length == 0 && advancedSearch) {
                $scope.selectedLetters2 = [{display:" "}];
            }
        } else if (selected == 3) {
            $scope.selectedLetters3 = selectedList;
            selectedLetters3 = selectedList;

            if ($scope.selectedLetters3.length == 0 && advancedSearch) {
                $scope.selectedLetters3 = [{display:" "}];
            }
        }
    };

    /*
     * search word list
     */
    $scope.searchWords = function(){
        searchWordList(selectedLetters, selectedLetters2, selectedLetters3);
        $scope.wordMatch = wordMatch;

        $scope.listLength = wordMatch.length;
        if (wordMatch.length < 10) {
            for (var i = 0; i < 10 ; i++) {
                if (typeof wordMatch[i] === 'undefined') {
                    $scope.wordMatch.push({word:" "});
                }
            }
        }
    };

    /*
     * returns the count of words in the word list
     */
    $scope.matchLength = function() {
        if ($scope.wordMatch[0].word == "Select one or more IPA codes" || $scope.wordMatch[0].word == "No results found") {
            return 0;
        } else {
            return $scope.listLength;
        }
    };

    $scope.advancedSearch = function() {
        if ($scope.selectedLetters.length == 0) {
            $scope.selectedLetters = [{display:" "}];
        }

        if ($scope.selectedLetters2.length == 0) {
            $scope.selectedLetters2 = [{display:" "}];
        }

        if ($scope.selectedLetters3.length == 0) {
            $scope.selectedLetters3 = [{display:" "}];
        }

        if (advancedSearch) {
            advancedSearch = false;
            if ($scope.selectedLetters[0].display == " ") {
                $scope.selectedLetters = [];
            }
        } else {
            advancedSearch = true;
        }
    };

    /*$scope.toggleBtn = function(clicked_event) {
        var id = clicked_event.target.id.substring(3,4);

        if (doc.getElementById(clicked_event.target.id).innerHTML == "AND") {
            doc.getElementById(clicked_event.target.id).innerHTML = "+";
            buttonTypes[id] = "+";
        } else if (doc.getElementById(clicked_event.target.id).innerHTML == "+") {
            doc.getElementById(clicked_event.target.id).innerHTML = "AND";
        }
    };

    $scope.toggleBtnAdv = function(clicked_event) {
        var id = clicked_event.target.id.substring(3,4);

        if (doc.getElementById(clicked_event.target.id).innerHTML == "OR") {
            doc.getElementById(clicked_event.target.id).innerHTML = "+";
            buttonTypes[id] = "+";
        } else if (doc.getElementById(clicked_event.target.id).innerHTML == "+") {
            doc.getElementById(clicked_event.target.id).innerHTML = "OR";
        }
    };*/

    $scope.activate1 = function() {
        $('.selected1').prop('disabled', false);
        $('.selected2').prop('disabled', true);
        $('.selected3').prop('disabled', true);
        selected = 1;
    };

    $scope.activate2 = function() {
        if (selectedLetters.length != 0) {
            $('.selected1').prop('disabled', true);
            $('.selected2').prop('disabled', false);
            $('.selected3').prop('disabled', true);
            selected = 2;
        } else {
            $('#alert').html('<div id="alert"><div id="fade" class="alert alert-danger alert-dismissable fade in" style="font-size:small"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>Use first list</div></div>');
            setTimeout(function() {
                $("#fade").fadeTo(1000, 0).slideUp(1000, function(){
                    $(this).remove();
                });
            }, 2000);
        }
    };

    $scope.activate3 = function() {
        if (selectedLetters2.length != 0) {
            $('.selected1').prop('disabled', true);
            $('.selected2').prop('disabled', true);
            $('.selected3').prop('disabled', false);
            selected = 3;
        } else {
            $('#alert').html('<div id="alert"><div id="fade" class="alert alert-danger alert-dismissable fade in" style="font-size:small"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>Use second list</div></div>');
            setTimeout(function() {
                $("#fade").fadeTo(1000, 0).slideUp(1000, function(){
                    $(this).remove();
                });
            }, 2000);
        }
    };

    $scope.combineSpellings = function() {
        if (combine) {
            combine = false;
            $scope.combined = false;

            $scope.spellingCombine1.display = " ";
            $scope.spellingCombine2.display = " ";
        } else {
            combine = true;
        }
    };

    $scope.confirmCombine = function(selectedList,index) {
        if ($scope.selectedLetters[index+1].display != " ") {
            var pattern = $scope.selectedLetters[index].pattern+$scope.selectedLetters[index+1].pattern;
            var phoneme = "/" + $scope.selectedLetters[index].phoneme.substring($scope.selectedLetters[index].phoneme.indexOf("/")+1, $scope.selectedLetters[index].phoneme.lastIndexOf("/")) + $scope.selectedLetters[index+1].phoneme.substring($scope.selectedLetters[index+1].phoneme.indexOf("/")+1, $scope.selectedLetters[index+1].phoneme.lastIndexOf("/")) + "/";
            selectedLetters[index] = {display:pattern + " = " + phoneme, gpc:$scope.selectedLetters[index].gpc + " " + $scope.selectedLetters[index+1].gpc, pattern:pattern, phoneme:phoneme};
            selectedLetters.splice(index+1,1);

            $('#alert').html('<div id="alert"><div id="fade" class="alert alert-success alert-dismissable fade in" style="font-size:small"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>Combined!</div></div>');
            setTimeout(function() {
                $("#fade").fadeTo(1000, 0).slideUp(1000, function(){
                    $(this).remove();
                });
            }, 2000);

            if ($scope.selectedLetters.length == 1) {
                $scope.combine1 = false;
                $scope.combine2 = false;
                $scope.combine3 = false;
            } else if ($scope.selectedLetters.length == 2) {
                $scope.combine1 = true;
                $scope.combine2 = false;
                $scope.combine3 = false;
            } else if ($scope.selectedLetters.length == 3) {
                $scope.combine1 = true;
                $scope.combine2 = true;
                $scope.combine3 = false;
            } else if ($scope.selectedLetters.length == 4) {
                $scope.combine1 = true;
                $scope.combine2 = true;
                $scope.combine3 = true;
            }
        }
    }

    /*
     * change sort to descending/ascending alphabetical order
     */
    $scope.sortAlpha = function() {
        if (alphaDes) {
            wordMatch.sort(compareWordAsc);
            alphaDes = false;
            freqDes = false;
            doc.getElementById("freqsort").className = "";
            doc.getElementById("alphasort").className = "glyphicon glyphicon-arrow-up";
        } else {
            wordMatch.sort(compareWordDes);
            alphaDes = true;
            freqDes = false;
            doc.getElementById("freqsort").className = "";
            doc.getElementById("alphasort").className = "glyphicon glyphicon-arrow-down";
        }
    };

    /*
     * change sort to descending/ascending frequency order
     */
    $scope.sortFreq = function() {
        if (freqDes) {
            wordMatch.sort(compareFreqAsc);
            freqDes = false;
            alphaDes = false;
            doc.getElementById("freqsort").className = "glyphicon glyphicon-arrow-up";
            doc.getElementById("alphasort").className = "";
        } else {
            wordMatch.sort(compareFreqDes);
            freqDes = true;
            alphaDes = false;
            doc.getElementById("freqsort").className = "glyphicon glyphicon-arrow-down";
            doc.getElementById("alphasort").className = "";
        }
    }

    $scope.resetPhonemes = function() {
        //empty phoneme grid
        $scope.phonemeRows = [];
        maxRows = 3;
        maxCols = 4;
        count = 0;
        for (var i = 0; i < maxRows; i++) {
            $scope.phonemeRows.push([]);
            for (var j = 0; j < maxCols; j++) {
                $scope.phonemeRows[i][j] = {sound: " "};
                count++;
            }
        }
    }
});

// comparator to sort word list in alphabetical descending order
function compareWordDes(a,b) {
    if (a.word < b.word)
        return -1;
    if (a.word > b.word)
        return 1;
    return 0;
}

// comparator to sort word list in alphabetical ascending order
function compareWordAsc(a,b) {
    if (a.word > b.word)
        return -1;
    if (a.word < b.word)
        return 1;
    return 0;
}

// comparator to sort word list by descending frequency
function compareFreqDes(a,b) {
    return b.freq - a.freq;
}

// comparator to sort word list by ascending frequency
function compareFreqAsc(a,b) {
    return a.freq - b.freq;
}

function optionsClick() {
    $('#collapseOne').collapse('show');
    $('#collapseTwo').collapse('hide');
}

function listClick() {
    $('#collapseOne').collapse('hide');
    $('#collapseTwo').collapse('show');
}