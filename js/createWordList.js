/**
 * Created by Miao on 3/29/14.
 */
var lines1 = new Array();
var lines2 = new Array();
var lines3 = new Array();
var wordList = new Array();
var wordData = new Array();
var wordDataList = new Array();
var phonics = new Array();
var phonics2 = new Array();
var phonics3 = new Array();
var wordMatch = new Array();
var words = new Array();
var soundCodes = new Array();
var ipa = new Array();
var numLimitSyl;
var numLimitLet;
var badWords = ["anal", "anus", "ass", "asshole", "assholes", "bastard", "bastards", "bitch", "bitches", "boner", "boners", "boob", "boobs", "breast", "breasts", "bullshit", "chink", "clitoris", "cocaine", "cock", "cocks", "cunt", "dick", "dicks", "dike", "dildo", "douche", "drunk", "drunks", "dyke", "erection", "erections", "faggot", "faggots", "fag", "fags", "fuck", "genitalia", "heroin", "jackass", "marijuana", "nigger", "penis", "piss", "pussy", "scrotum", "semen", "shit", "testicle", "testicles", "tit", "tits", "vagina", "whore", "whore"];

$(document).ready(function() {
    // load AmericanWordDataList.txt and create the list for all words when document is ready

    $.get('AmericanWordDataList.txt', function(data) {
        lines3 = data.split('\n');
        lines3.forEach(function(value) {
            var split = value.split("\t");
            if (split[2].length > 1) {
                wordList.push({word:split[0], fullPhonic:split[1], phonic:split[2], phonNum:split[4], sylNum:split[5], freq:split[7]});
            }
        });

        // sort list alphabetically
        //wordList.sort(compareWord);
    }, 'text');

    // max syllables
    numLimitSyl = 4;

    $("#sylgroup > #syl").click(function(){
        $("#sylgroup > #syl").removeClass("active");
        $(this).addClass("active");
    });

    $("#sylgroup").on("click", "button[id=syl]", function(){
        numLimitSyl = parseInt($(this).attr("value"));
    });

    // max letters
    numLimitLet = 10;

    $("#letgroup > #let").click(function(){
        $("#letgroup > #let").removeClass("active");
        $(this).addClass("active");
    });

    $("#letgroup").on("click", "button[id=let]", function(){
        numLimitLet = parseInt($(this).attr("value"));
    });

    // frequency slider
    initializeFreqSlider();
});

// comparator to sort word list in alphabetical order
function compareWord(a,b) {
    if (a.word < b.word)
        return -1;
    if (a.word > b.word)
        return 1;
    return 0;
}

// comparator to sort word list by frequency
function compareFreq(a,b) {
    return b.freq - a.freq;
}

function searchWordList(selected1, selected2, selected3) {
    if (advancedSearch) {
        searchWordListAdvAux(selected1, selected2, selected3);
    } else {
        searchWordListAux(selected1);
    }
}

/*
 * search through word list
 */
function searchWordListAux(selected) {
    //$('#searching').button('loading');

    phonics = [];
    wordMatch = [];
    var frequency = $("#slider").val();

    selected.forEach(function(value) {
        phonics.push(value.gpc);
    });

    var shouldBeAdded = true;
    if (selected.length != 0) {
        for (var i = 0; i < wordList.length; i++) {
        //wordList.forEach(function(value, index) {
            var k = 0;
            shouldBeAdded = true;
            while (k < selected.length && shouldBeAdded) {
                if (document.getElementById("only").checked) {
                    for (var j = 0; j < phonics.length; j++) {
                    //phonics.forEach(function(val, ind) {
                        if (wordList[i].phonic.indexOf(phonics[j]) == -1 || wordList[j].phonNum > phonics.length) {
                            shouldBeAdded = false;
                            return;
                        }
                    }
                }

                phonics.forEach(function(val, ind) {
                    // don't add words over syllable limit
                    if (numLimitSyl != 0) {
                        if (wordList[ind].sylNum > numLimitSyl) {
                            shouldBeAdded = false;
                            return;
                        }
                    }

                    // don't add words over letter limit
                    if (numLimitLet != 0) {
                        if (wordList[i].word.length > numLimitLet) {
                            shouldBeAdded = false;
                            return;
                        }
                    }

                    // don't add words with no corresponding phonemes
                    if (wordList[i].phonic.indexOf(val) == -1) {
                        shouldBeAdded = false;
                        return;
                    }

                    if (wordList[i].phonic[wordList[i].phonic.indexOf(val)-1] != " " && wordList[i].phonic.indexOf(val) != 0) {
                        shouldBeAdded = false;
                        return;
                    }
                });

                if (wordList[i].freq < parseInt(frequency[0])-1 || wordList[i].freq > parseInt(frequency[1])) {
                    shouldBeAdded = false;
                }

                if (badFilter) {
                    if (binaryIndexOf.call(badWords, wordList[i].word) != -1) {
                        shouldBeAdded = false;
                    }
                }

                k++;
            }

            if (shouldBeAdded) {
                // push entire value
                wordMatch.push({word:wordList[i].word, phonic:wordList[i].phonic, fullPhonic:wordList[i].fullPhonic, freq:wordList[i].freq});
            }
        }

        if (wordMatch.length > 0) {
            $('#alert').html('<div id="alert"><div id="fade" class="alert alert-success alert-dismissable fade in" style="font-size:small"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>Done!</div></div>');
            setTimeout(function() {
                $("#fade").fadeTo(1000, 0).slideUp(1000, function(){
                    $(this).remove();
                });
            }, 2000);
        } else if (wordMatch.length == 0) {
            $('#alert').html('<div id="alert"><div id="fade" class="alert alert-danger alert-dismissable fade in" style="font-size:small"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>No results found</div></div>');
            setTimeout(function() {
                $("#fade").fadeTo(1000, 0).slideUp(1000, function(){
                    $(this).remove();
                });
            }, 2000);
        }
    } else {
        $('#alert').html('<div id="alert"><div id="fade" class="alert alert-danger alert-dismissable fade in" style="font-size:small"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>Select one or more phonemes</div></div>');
        setTimeout(function() {
            $("#fade").fadeTo(1000, 0).slideUp(1000, function(){
                $(this).remove();
            });
        }, 2000);
    }

    // set up processed word list to display
    wordMatch.forEach(function(value) {
        if (value.word == "Select one or more phonemes" || value.word == "No results found") {
            return;
        } else {
            var split = value.phonic.split(' ');
            var phonics = "";

            split.forEach(function(val, index) {
                if (ipaFlag) {
                    ipa.forEach(function(v) {
                        if (val.substring(val.indexOf("[")+1, val.indexOf("]")) == v.code && val.substring(val.indexOf("[")+1, val.indexOf("]")) != "") {
                            split[index] = val.substring(0, val.indexOf("[")) + " = /" + String.fromCharCode(parseInt(v.one, 16)) + String.fromCharCode(parseInt(v.two, 16)) + String.fromCharCode(parseInt(v.three, 16)) + "/";
                        }

                        if (val.substring(val.indexOf("[")+1, val.indexOf("]")) == "") {
                            split[index] = val.substring(0, val.indexOf("[")) + " = / /";
                        }
                    });

                    phonics += " " + split[index] + " ";
                } else {
                    soundCodes.forEach(function(v) {
                        if (val.substring(val.indexOf("[")+1, val.indexOf("]")) == v.code && val.substring(val.indexOf("[")+1, val.indexOf("]")) != "") {
                            split[index] = val.substring(0, val.indexOf("[")) + " = /" + String.fromCharCode(parseInt(v.one, 16)) + String.fromCharCode(parseInt(v.two, 16)) + String.fromCharCode(parseInt(v.three, 16)) + String.fromCharCode(parseInt(v.four, 16)) + String.fromCharCode(parseInt(v.five, 16)) + "/";
                        }

                        if (val.substring(val.indexOf("[")+1, val.indexOf("]")) == "") {
                            split[index] = val.substring(0, val.indexOf("[")) + " = / /";
                        }
                    });

                    phonics += " " + split[index] + " ";
                }
            });

            value.phonic = phonics;
        }
    });

    // sort list by frequency
    if (freqDes) {
        wordMatch.sort(compareFreqDes);
    } else if (document.getElementById("freqsort").className == "glyphicon glyphicon-arrow-up") {
        wordMatch.sort(compareFreqAsc);
    } else if (alphaDes) {
        wordMatch.sort(compareWordDes);
    } else if (document.getElementById("alphasort").className == "glyphicon glyphicon-arrow-up") {
        wordMatch.sort(compareWordAsc);
    }
}

function searchWordListAdvAux(selected1, selected2, selected3) {
    phonics = [];
    phonics2 = [];
    phonics3 = [];
    wordMatch = [];
    var wordMatchAux = [];
    var wordMatchAux2 = [];

    selected1.forEach(function(value) {
        phonics.push(value.gpc);
    });

    selected2.forEach(function(value) {
        phonics2.push(value.gpc);
    });

    selected3.forEach(function(value) {
        phonics3.push(value.gpc);
    });

    var shouldBeAdded = true;
    var existOr = false;
    if (selected1.length != 0) {
        wordList.forEach(function(value, index) {
            var k = 0;
            shouldBeAdded = true;
            existOr = false;
            while (k < selected1.length && shouldBeAdded) {
                if (document.getElementById("only").checked) {
                    phonics.forEach(function(val, i) {
                        if (value.phonic.indexOf(val) == -1 || value.phonNum > phonics.length) {
                            shouldBeAdded = false;
                            return;
                        }
                    });
                }

                phonics.forEach(function(val, i) {
                    // don't add words over syllable limit
                    if (numLimitSyl != 0) {
                        if (value.sylNum > numLimitSyl) {
                            shouldBeAdded = false;
                            return;
                        }
                    }

                    // don't add words over letter limit
                    if (numLimitLet != 0) {
                        if (value.word.length > numLimitLet) {
                            shouldBeAdded = false;
                            return;
                        }
                    }

                    if (value.phonic.indexOf(val) != -1) {
                        existOr = true;

                        if (value.phonic[value.phonic.indexOf(val)-1] != " " && value.phonic.indexOf(val) != 0) {
                            shouldBeAdded = false;
                            return;
                        }
                    }
                });

                if (!existOr) {
                    shouldBeAdded = false;
                }

                k++;
            }

            if (shouldBeAdded) {
                // push entire value
                wordMatchAux.push({word:value.word, phonic:value.phonic, fullPhonic:value.fullPhonic, freq:value.freq});
            }
        });


        if (phonics2.length > 0) {
            wordMatch = [];

            wordMatchAux.forEach(function(value) {
                existOr = false;
                phonics2.forEach(function(val) {
                    if (value.phonic.indexOf(val) != -1) {
                        existOr = true;
                    }
                });

                if (existOr) {
                       wordMatchAux2.push({word:value.word, phonic:value.phonic, fullPhonic:value.fullPhonic, freq:value.freq});
                }
            });

            wordMatch = wordMatchAux2;
        } else {
            wordMatch = wordMatchAux;
        }


        if (phonics3.length > 0) {
            wordMatch = [];
            wordMatchAux2.forEach(function(value) {
                existOr = false;
                phonics3.forEach(function(val) {
                    if (value.phonic.indexOf(val) != -1) {
                        existOr = true;
                    }
                });

                if (existOr) {
                    wordMatch.push({word:value.word, phonic:value.phonic, fullPhonic:value.fullPhonic, freq:value.freq});
                }
            });
        }

        if (wordMatch.length > 0) {
            $('#alert').html('<div id="alert"><div id="fade" class="alert alert-success alert-dismissable fade in" style="font-size:small"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>Done!</div></div>');
            setTimeout(function() {
                $("#fade").fadeTo(1000, 0).slideUp(1000, function(){
                    $(this).remove();
                });
            }, 2000);
        } else if (wordMatch.length == 0) {
            $('#alert').html('<div id="alert"><div id="fade" class="alert alert-danger alert-dismissable fade in" style="font-size:small"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>No results found</div></div>');
            setTimeout(function() {
                $("#fade").fadeTo(1000, 0).slideUp(1000, function(){
                    $(this).remove();
                });
            }, 2000);
        }
    } else {
        $('#alert').html('<div id="alert"><div id="fade" class="alert alert-danger alert-dismissable fade in" style="font-size:small"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>Select one or more phonemes</div></div>');
        setTimeout(function() {
            $("#fade").fadeTo(1000, 0).slideUp(1000, function(){
                $(this).remove();
            });
        }, 2000);
    }

    // set up processed word list to display
    wordMatch.forEach(function(value) {
        if (value.word == "Select one or more phonemes" || value.word == "No results found") {
            return;
        } else {
            var split = value.phonic.split(' ');
            var phonics = "";

            split.forEach(function(val, index) {
                if (ipaFlag) {
                    ipa.forEach(function(v) {
                        if (val.substring(val.indexOf("[")+1, val.indexOf("]")) == v.code && val.substring(val.indexOf("[")+1, val.indexOf("]")) != "") {
                            split[index] = val.substring(0, val.indexOf("[")) + " = /" + String.fromCharCode(parseInt(v.one, 16)) + String.fromCharCode(parseInt(v.two, 16)) + String.fromCharCode(parseInt(v.three, 16)) + "/";
                        }

                        if (val.substring(val.indexOf("[")+1, val.indexOf("]")) == "") {
                            split[index] = val.substring(0, val.indexOf("[")) + " = / /";
                        }
                    });

                    phonics += " " + split[index] + " ";
                } else {
                    soundCodes.forEach(function(v) {
                        if (val.substring(val.indexOf("[")+1, val.indexOf("]")) == v.code && val.substring(val.indexOf("[")+1, val.indexOf("]")) != "") {
                            split[index] = val.substring(0, val.indexOf("[")) + " = /" + String.fromCharCode(parseInt(v.one, 16)) + String.fromCharCode(parseInt(v.two, 16)) + String.fromCharCode(parseInt(v.three, 16)) + String.fromCharCode(parseInt(v.four, 16)) + String.fromCharCode(parseInt(v.five, 16)) + "/";
                        }

                        if (val.substring(val.indexOf("[")+1, val.indexOf("]")) == "") {
                            split[index] = val.substring(0, val.indexOf("[")) + " = / /";
                        }
                    });

                    phonics += " " + split[index] + " ";
                }
            });

            value.phonic = phonics;
        }
    });

    // sort list by frequency
    if (freqDes) {
        wordMatch.sort(compareFreqDes);
    } else if (document.getElementById("freqsort").className == "glyphicon glyphicon-arrow-up") {
        wordMatch.sort(compareFreqAsc);
    } else if (alphaDes) {
        wordMatch.sort(compareWordDes);
    } else if (document.getElementById("alphasort").className == "glyphicon glyphicon-arrow-up") {
        wordMatch.sort(compareWordAsc);
    }
}

/**
 * Performs a binary search on the host array. This method can either be
 * injected into Array.prototype or called with a specified scope like this:
 * binaryIndexOf.call(someArray, searchElement);
 *
 * @param {*} searchElement The item to search for within the array.
 * @return {Number} The index of the element which defaults to -1 when not found.
 */
function binaryIndexOf(searchElement) {
    'use strict';

    var minIndex = 0;
    var maxIndex = this.length - 1;
    var currentIndex;
    var currentElement;

    while (minIndex <= maxIndex) {
        currentIndex = (minIndex + maxIndex) / 2 | 0;
        currentElement = this[currentIndex];

        if (currentElement < searchElement) {
            minIndex = currentIndex + 1;
        }
        else if (currentElement > searchElement) {
            maxIndex = currentIndex - 1;
        }
        else {
            return currentIndex;
        }
    }

    return -1;
}

function initializeFreqSlider() {
    var values = [0, 20, 40, 100, 200, 400, 600, 1000, 3000, 5000, 10000, 30000, 50000, 100000, 500000, 1000000, 5000000, 10000000];

    /*var $slider = $("#slider").slider({ max: 17, range: true, values: [ 0, 17 ] });
    $slider.slider("float", {labels: values});

    $slider.slider("pips" , { rest: false, labels: values })*/
    $("#slider").noUiSlider({
        start: [0, 25000000],
        behaviour: 'drag-tap',
        connect: true,
        range: {
            'min': [     0 ],
            '10%': [   5000,  1000 ],
            '25%': [  50000, 10000 ],
            '50%': [  500000, 100000 ],
            '75%': [  5000000, 1000000 ],
            'max': [ 25000000 ]
        },

        serialization: {

            lower: [

                $.Link({
                    // Place the value in the #value element,
                    // using the text method.
                    target: $("#minFreq"),
                    method: "text"
                }),

                $.Link({
                    target: $("#minFreq"),
                    format: {
                        // Write the value using 1 decimal.
                        decimals: 0
                    }
                })

            ],

            upper: [

                $.Link({
                    // Link accepts functions too.
                    // The arguments are the slider value,
                    // the .noUi-handle element and the slider instance.
                    target: function( value, handleElement, slider ){

                        $("#maxFreq").text( value );

                    }
                }),

                $.Link({
                    target: $("#maxFreq"),
                    format: {
                        // Write the value using 1 decimal.
                        decimals: 0
                    }
                }),

                $.Link({
                    // When you pass a string to a link,
                    // it will create a hidden input.
                    // You'll see the value appear when you
                    // alert the form contents.
                    target: "inputName"
                })

            ],

            // Set some default formatting options.
            // These options will be applied to any Link
            // that doesn't overwrite these values.
            format: {
                decimals: 0
            }

        }
    });
}