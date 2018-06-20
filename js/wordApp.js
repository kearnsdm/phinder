/*
 * Created by Miao on 3/18/14.
 */
var doc = document;
var txtlines1 = [];
var txtlines2 = [];
var soundCodes = [];
var ipa = [];
var soundLetters = [];
var allSounds = [];
var selectedLetters = [];
var selectedLetters2 = [];
var selectedLetters3 = [];
var wordMatch = [];
var uniqueLetters = [];
var ipaFlag = true;
var alphaDes = false;
var freqDes = true;
var advancedSearch = false;
var selected = 1;

$(function() {
	// IPA/Sound Code Switch
	$(".disable")
		.find("td,table")
		.attr("disabled", "disabled");

	// Bootstrap hover tooltips
	$(".plus").tooltip();
	$(".refmodal").tooltip();
	$(".only").tooltip();
	$(".help").tooltip();
	$("#combination").tooltip();
	$("#adv").tooltip();
});

// starts angularjs
var app = angular
	.module("angularjs-starter", ["ngAnimate"])
	.directive("mySearchDirective", function() {
		return function(scope) {
			if (scope.$last) {
				$("#searching").button("reset");
			}
		};
	})
	.directive("myAddDirective", function() {
		return function(scope) {
			if (scope.$last) {
				if (selected == 2) {
					$(".selected2").prop("disabled", false);
				} else if (selected == 3) {
					$(".selected3").prop("disabled", false);
				}
			}
		};
	})
	.directive("myConfirmDirective", function() {
		return function(scope) {
			if (scope.$last) {
				if (selected == 2) {
					$(".selected2").prop("disabled", false);
				} else if (selected == 3) {
					$(".selected3").prop("disabled", false);
				}
			}
		};
	});

// set up controller
app.controller("phonicCtrl", function($scope) {
	$(document).ready(function() {
		// load SoundList.txt and create the list for all sound patterns when document is ready
		$.get(
			"SoundList.txt",
			function(data) {
				txtlines1 = data.split("\n");
				txtlines1.forEach(function(value) {
					soundLetters.push(value.substring(0, value.indexOf("_")));
					allSounds.push(
						value.substring(value.indexOf("_") + 1, value.length - 1)
					);
				});

				// only use unique letters
				uniqueLetters = [];
				$.each(soundLetters, function(i, el) {
					if ($.inArray(el, uniqueLetters) === -1) uniqueLetters.push(el);
				});

				$scope.addPatterns();
			},
			"text"
		);

		// load Sound_IPA_List.txt and create the lists for all sound codes and IPAs when document is ready
		$.get(
			"Sound_IPA_List.txt",
			function(data) {
				txtlines2 = data.split("\n");
				txtlines2.forEach(function(value) {
					var split = value.split("\t");
					soundCodes.push({
						code: split[0],
						one: split[1],
						two: split[2],
						three: split[3],
						four: split[4],
						five: split[5],
					});
					ipa.push({
						code: split[0],
						one: split[6],
						two: split[7],
						three: split[8],
					});
				});
			},
			"text"
		);

		$(".dropdown-menu li a").click(function() {
			var selText = $(this).text();
			if (this.className == "desc") {
				$(this)
					.parents(".btn-group")
					.find(".dropdown-toggle")
					.html(selText + ' <span class="caret"></span>');
			} else {
				$(this)
					.parents(".btn-group")
					.find(".dropdown-toggle")
					.html(selText + ' <span class="caret caret-reversed"></span>');
			}
		});
	});

	$scope.listLength = 0;
	$scope.defPatterns = [
		"a",
		"ar",
		"ck",
		"e",
		"ea",
		"ee",
		"igh",
		"i_e",
		"k",
		"m",
		"oa",
		"ow",
		"qu",
		"x",
		"y",
		"...",
	];
	$scope.patterns = [
		"a",
		"aa",
		"ae",
		"ah",
		"ai",
		"ais",
		"ait",
		"al",
		"alf",
		"anc",
		"and",
		"ang",
		"ao",
		"aoh",
		"at",
		"au",
		"aw",
		"ay",
		"b",
		"bb",
		"c",
		"cc",
		"ch",
		"chm",
		"chs",
		"cht",
		"ci",
		"ck",
		"cz",
		"d",
		"dd",
		"dg",
		"dge",
		"dj",
		"e",
		"ea",
		"eau",
		"eaux",
		"ee",
		"eh",
		"ei",
		"em",
		"en",
		"ent",
		"eo",
		"es",
		"et",
		"eu",
		"ew",
		"ey",
		"eye",
		"ez",
		"f",
		"ff",
		"g",
		"gg",
		"gh",
		"gm",
		"h",
		"hu",
		"i",
		"ia",
		"ie",
		"ieu",
		"io",
		"iou",
		"is",
		"iu",
		"j",
		"ju",
		"k",
		"kh",
		"kk",
		"kn",
		"l",
		"ll",
		"m",
		"mm",
		"mn",
		"mp",
		"mps",
		"n",
		"nc",
		"nd",
		"ng",
		"nn",
		"o",
		"oa",
		"oe",
		"oeu",
		"oh",
		"oi",
		"oid",
		"oint",
		"ois",
		"ol",
		"olo",
		"ont",
		"oo",
		"ot",
		"ou",
		"ough",
		"oul",
		"oup",
		"oux",
		"ow",
		"oy",
		"p",
		"pf",
		"ph",
		"pht",
		"pn",
		"pp",
		"ps",
		"psh",
		"pt",
		"q",
		"r",
		"rps",
		"rr",
		"rrh",
		"s",
		"sc",
		"sch",
		"sh",
		"ss",
		"t",
		"tch",
		"th",
		"ti",
		"tsch",
		"tsh",
		"tt",
		"u",
		"ua",
		"ue",
		"uh",
		"ui",
		"uo",
		"uoy",
		"uy",
		"v",
		"vv",
		"w",
		"wai",
		"wh",
		"wo",
		"wr",
		"x",
		"y",
		"z",
		"zz",
		"'",
		"+",
		"_",
	];
	$scope.ipas = [
		"`",
		"`r",
		"a",
		"A",
		"A~",
		"2",
		"aI",
		"A~n",
		"a~n",
		"aU",
		"b",
		"O",
		"OI",
		"O~n",
		"d",
		"D",
		"dZ",
		"e",
		"@",
		"@`",
		"@m",
		"@n",
		"@r",
		"E",
		"3",
		"3`",
		"E@",
		"f",
		"g",
		"gz",
		"gZ",
		"h",
		"H",
		"i",
		"I",
		"I@",
		"j",
		"ja",
		"jO",
		"je",
		"j@",
		"jE",
		"j3",
		"jo",
		"ju",
		"jU",
		"jU@",
		"k",
		"ks",
		"kS",
		"kz",
		"l",
		"l=",
		"m",
		"m=",
		"n",
		"n=",
		"N",
		"o",
		"T",
		"p",
		"r",
		"4",
		"R",
		"s",
		"S",
		"t",
		"ts",
		"tS",
		"u",
		"U",
		"U@",
		"v",
		"V",
		"w",
		"hw",
		"wa",
		"wA",
		"waI",
		"w@",
		"wi",
		"wV",
		"x",
		"jA",
		"z",
		"Z",
		"_",
	];
	$scope.wordMatch = [
		{ word: " " },
		{ word: " " },
		{ word: " " },
		{ word: " " },
		{ word: " " },
		{ word: " " },
		{ word: " " },
		{ word: " " },
		{ word: " " },
		{ word: " " },
	];
	$scope.matchingLetters = [];
	$scope.ipaMatch = [];
	$scope.soundMatch = [];
	$scope.sounds = [];
	$scope.selectedLetters = [];
	$scope.selectedLetters2 = [];
	$scope.selectedLetters3 = [];
	$scope.history = [];
	var matchingLetters = [];
	var ipaMatch = [];
	var soundMatch = [];
	$scope.spellingCombine1 = { display: " " };
	$scope.spellingCombine2 = { display: " " };
	$scope.spellingCombine3 = { display: " " };
	$scope.combination = { display: " " };
	$scope.combined = false;
	$scope.combine1 = false;
	$scope.combine2 = false;
	$scope.combine3 = false;
	$scope.modalpage = 1;

	// default letter pattern grid
	$scope.defPatternRows = [];
	var maxRows = 4;
	var maxCols = 4;
	var count = 0;
	for (var i = 0; i < maxRows; i++) {
		$scope.defPatternRows.push([]);
		for (var j = 0; j < maxCols; j++) {
			$scope.defPatternRows[i][j] = $scope.defPatterns[count];
			count++;
		}
	}

	// letter pattern grid
	$scope.patternRows = [];
	var maxRows = 4;
	var maxCols = 39;
	var count = 0;
	for (i = 0; i < maxRows; i++) {
		$scope.patternRows.push([]);
		for (j = 0; j < maxCols; j++) {
			$scope.patternRows[i][j] = $scope.patterns[count];
			count++;
		}
	}

	// phoneme grid
	$scope.phonemeRows = [];
	maxRows = 3;
	maxCols = 4;
	count = 0;
	for (var i = 0; i < maxRows; i++) {
		$scope.phonemeRows.push([]);
		for (var j = 0; j < maxCols; j++) {
			$scope.phonemeRows[i][j] = { sound: " " };
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

		txtlines1.forEach(function(value, index) {
			if (clickEvent.target.innerHTML == soundLetters[index]) {
				matchingLetters.push({
					code: clickEvent.target.innerHTML,
					gpc: value.substring(value.indexOf("_") + 1, value.length - 1),
				});
			}
		});

		matchingLetters.forEach(function(value, index) {
			ipa.forEach(function(v) {
				if (value.gpc == v.code && value.gpc != "") {
					ipaMatch[index] = {
						code: value.code,
						sound:
							"/" +
							String.fromCharCode(parseInt(v.one, 16)) +
							String.fromCharCode(parseInt(v.two, 16)) +
							String.fromCharCode(parseInt(v.three, 16)) +
							"/",
						gpc: value.code + "_" + value.gpc + "_",
					};
				}

				if (value.gpc == "") {
					ipaMatch[index] = {
						code: value.code,
						sound: "/ /",
						gpc: value.code + "_" + value.gpc + "_",
					};
				}
			});

			soundCodes.forEach(function(v) {
				if (value.gpc == v.code && value.gpc != "") {
					soundMatch[index] = {
						code: value.code,
						sound:
							"/" +
							String.fromCharCode(parseInt(v.one, 16)) +
							String.fromCharCode(parseInt(v.two, 16)) +
							String.fromCharCode(parseInt(v.three, 16)) +
							String.fromCharCode(parseInt(v.four, 16)) +
							String.fromCharCode(parseInt(v.five, 16)) +
							"/",
						gpc: value.code + "_" + value.gpc + "_",
					};
				}

				if (value.gpc == "") {
					soundMatch[index] = {
						code: value.code,
						sound: "/ /",
						gpc: value.code + "_" + value.gpc + "_",
					};
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
		for (var i = 0; i < maxRows; i++) {
			$scope.phonemeRows.push([]);
			for (var j = 0; j < maxCols; j++) {
				if (count >= $scope.sounds.length) {
					$scope.phonemeRows[i][j] = { code: " ", sound: " ", gpc: " " };
				} else {
					$scope.phonemeRows[i][j] = $scope.sounds[count];
				}
				count++;
			}
		}
	};

	/*
     * add and display IPAs
     */
	$scope.addIPAs = function() {
		ipaFlag = false;
		$scope.sounds = ipaMatch;

		// update phoneme grid
		$scope.phonemeRows = [];
		maxRows = 3;
		maxCols = 4;
		count = 0;
		for (var i = 0; i < maxRows; i++) {
			$scope.phonemeRows.push([]);
			for (var j = 0; j < maxCols; j++) {
				if (count >= $scope.sounds.length) {
					$scope.phonemeRows[i][j] = { code: " ", sound: " ", gpc: " " };
				} else {
					$scope.phonemeRows[i][j] = $scope.sounds[count];
				}
				count++;
			}
		}

		$("#soundtoggle")
			.removeClass("activated")
			.addClass("notactive");
		$("#ipatoggle")
			.removeClass("notactive")
			.addClass("activated");
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
		for (var i = 0; i < maxRows; i++) {
			$scope.phonemeRows.push([]);
			for (var j = 0; j < maxCols; j++) {
				if (count >= $scope.sounds.length) {
					$scope.phonemeRows[i][j] = { code: " ", sound: " ", gpc: " " };
				} else {
					$scope.phonemeRows[i][j] = $scope.sounds[count];
				}
				count++;
			}
		}

		$("#soundtoggle")
			.removeClass("notactive")
			.addClass("activated");
		$("#ipatoggle")
			.removeClass("activated")
			.addClass("notactive");
	};

	$scope.addSelected = function(clickedEvent) {
		if (selected == 1) {
			$scope.addSelectedAux(clickedEvent, selectedLetters);
		} else if (selected == 2) {
			$scope.addSelectedAux(clickedEvent, selectedLetters2);
		} else if (selected == 3) {
			$scope.addSelectedAux(clickedEvent, selectedLetters3);
		}

		if ($scope.selectedLetters.length == 2) {
			$scope.combine1 = true;
		}

		if ($scope.selectedLetters.length == 3) {
			$scope.combine2 = true;
		}

		if ($scope.selectedLetters.length == 4) {
			$scope.combine3 = true;
		}
	};

	/*
     * add selected sound spellings
     */
	$scope.addSelectedAux = function(clickedEvent, selectedList) {
		if (selectedList.length != 0) {
			if (selectedList[0].display == " ") {
				selectedList = [];
			}
		}

		var sel = clickedEvent.target.id.split(" ");
		var flag = true;

		if (selectedList.length == 0) {
			if (flag && sel[1] == "/") {
				selectedList.push({
					display: sel[0] + " = / /",
					gpc: sel[3],
					pattern: sel[0],
					phoneme: sel[1],
				});
				$scope.history.unshift({
					display: sel[0] + " = / /",
					gpc: sel[3],
					pattern: sel[0],
					phoneme: sel[1],
				});
			} else if (sel[0] == "") {
				return;
			} else {
				selectedList.push({
					display: sel[0] + " = " + sel[1],
					gpc: sel[2],
					pattern: sel[0],
					phoneme: sel[1],
				});
				$scope.history.unshift({
					display: sel[0] + " = " + sel[1],
					gpc: sel[2],
					pattern: sel[0],
					phoneme: sel[1],
				});
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

			if (flag && sel[1] == "/") {
				selectedList.push({
					display: sel[0] + " = / /",
					gpc: sel[3],
					pattern: sel[0],
					phoneme: sel[1],
				});
				$scope.history.unshift({
					display: sel[0] + " = / /",
					gpc: sel[3],
					pattern: sel[0],
					phoneme: sel[1],
				});
			} else if (sel[0] == "") {
				return;
			} else if (flag) {
				selectedList.push({
					display: sel[0] + " = " + sel[1],
					gpc: sel[2],
					pattern: sel[0],
					phoneme: sel[1],
				});
				$scope.history.unshift({
					display: sel[0] + " = " + sel[1],
					gpc: sel[2],
					pattern: sel[0],
					phoneme: sel[1],
				});
			}
		}

		if (selected == 1) {
			$scope.selectedLetters = selectedList;
			selectedLetters = selectedList;
		} else if (selected == 2) {
			$scope.selectedLetters2 = selectedList;
			selectedLetters2 = selectedList;
			$(".selected2").prop("disabled", false);
		} else if (selected == 3) {
			$scope.selectedLetters3 = selectedList;
			selectedLetters3 = selectedList;
			$(".selected3").prop("disabled", false);
		}
	};

	$scope.addHistory = function(index) {
		var flag = true;

		if (selected == 1) {
			for (i = 0; i < $scope.selectedLetters.length; i++) {
				if (
					$scope.selectedLetters[i].display == $scope.history[index].display
				) {
					flag = false;
				}
			}

			if (flag) {
				if (
					$scope.selectedLetters.length == 0 ||
					$scope.selectedLetters[0].display == " "
				) {
					$scope.selectedLetters[0] = {
						display: $scope.history[index].display,
						gpc: $scope.history[index].gpc,
						pattern: $scope.history[index].pattern,
						phoneme: $scope.history[index].phoneme,
					};
				} else {
					$scope.selectedLetters.push({
						display: $scope.history[index].display,
						gpc: $scope.history[index].gpc,
						pattern: $scope.history[index].pattern,
						phoneme: $scope.history[index].phoneme,
					});
				}
			}
		} else if (selected == 2) {
			for (i = 0; i < $scope.selectedLetters2.length; i++) {
				if (
					$scope.selectedLetters2[i].display == $scope.history[index].display
				) {
					flag = false;
				}
			}

			if (flag) {
				if ($scope.selectedLetters2[0].display == " ") {
					$scope.selectedLetters2[0] = {
						display: $scope.history[index].display,
						gpc: $scope.history[index].gpc,
						pattern: $scope.history[index].pattern,
						phoneme: $scope.history[index].phoneme,
					};
				} else {
					$scope.selectedLetters2.push({
						display: $scope.history[index].display,
						gpc: $scope.history[index].gpc,
						pattern: $scope.history[index].pattern,
						phoneme: $scope.history[index].phoneme,
					});
				}
			}

			$(".selected2").prop("disabled", false);
		} else if (selected == 3) {
			for (i = 0; i < $scope.selectedLetters3.length; i++) {
				if (
					$scope.selectedLetters3[i].display == $scope.history[index].display
				) {
					flag = false;
				}
			}

			if (flag) {
				if ($scope.selectedLetters3[0].display == " ") {
					$scope.selectedLetters3[0] = {
						display: $scope.history[index].display,
						gpc: $scope.history[index].gpc,
						pattern: $scope.history[index].pattern,
						phoneme: $scope.history[index].phoneme,
					};
				} else {
					$scope.selectedLetters3.push({
						display: $scope.history[index].display,
						gpc: $scope.history[index].gpc,
						pattern: $scope.history[index].pattern,
						phoneme: $scope.history[index].phoneme,
					});
				}
			}

			$(".selected3").prop("disabled", false);
		}
	};

	$scope.removeSelected1 = function(clickedEvent) {
		if (
			clickedEvent.target.innerHTML.indexOf(" ") == 0 ||
			clickedEvent.target.textContent == "    " ||
			clickedEvent.target.textContent == "     " ||
			(clickedEvent.target.textContent == "" && selectedLetters.length == 0)
		) {
			return;
		} else {
			if (
				(selected == 1 &&
					$(".select2").hasClass("disable") &&
					$(".select3").hasClass("disable")) ||
				(selected == 1 && !advancedSearch)
			) {
				$scope.removeSelectedAux(clickedEvent, selectedLetters);
			}
		}
	};

	$scope.removeSelected2 = function(clickedEvent) {
		if (
			clickedEvent.target.innerHTML.indexOf(" ") == 0 ||
			clickedEvent.target.textContent == "    " ||
			clickedEvent.target.textContent == "     " ||
			(clickedEvent.target.textContent == "" && selectedLetters.length == 0)
		) {
			return;
		} else {
			if (
				selected == 2 &&
				$(".select1").hasClass("disable") &&
				$(".select3").hasClass("disable")
			) {
				$scope.removeSelectedAux(clickedEvent, selectedLetters2);
			}
		}
	};

	$scope.removeSelected3 = function(clickedEvent) {
		if (
			clickedEvent.target.innerHTML.indexOf(" ") == 0 ||
			clickedEvent.target.textContent == "    " ||
			clickedEvent.target.textContent == "     " ||
			(clickedEvent.target.textContent == "" && selectedLetters.length == 0)
		) {
			return;
		} else {
			if (
				selected == 3 &&
				$(".select1").hasClass("disable") &&
				$(".select2").hasClass("disable")
			) {
				$scope.removeSelectedAux(clickedEvent, selectedLetters3);
			}
		}
	};

	/*
     * remove selected sound spelling
     */
	$scope.removeSelectedAux = function(clickedEvent, selectedList) {
		for (var i = 0; i < selectedList.length; i++) {
			if (
				clickedEvent.target.id.indexOf(selectedList[i].gpc) > -1 ||
				clickedEvent.target.parentElement.id ||
				clickedEvent.target.children[0].id
			) {
				selectedList.splice(i, 1);
				break;
			}
		}

		if (selected == 1) {
			$scope.selectedLetters = selectedList;
			selectedLetters = selectedList;

			if ($scope.selectedLetters.length == 0 && advancedSearch) {
				$scope.selectedLetters = [{ display: " " }];
			}
		} else if (selected == 2) {
			$scope.selectedLetters2 = selectedList;
			selectedLetters2 = selectedList;

			if ($scope.selectedLetters2.length == 0 && advancedSearch) {
				$scope.selectedLetters2 = [{ display: " " }];
			}
		} else if (selected == 3) {
			$scope.selectedLetters3 = selectedList;
			selectedLetters3 = selectedList;

			if ($scope.selectedLetters3.length == 0 && advancedSearch) {
				$scope.selectedLetters3 = [{ display: " " }];
			}
		}
	};

	/*
     * search word list
     */
	$scope.searchWords = function() {
		searchWordList(selectedLetters, selectedLetters2, selectedLetters3);
		$scope.wordMatch = wordMatch;

		$scope.listLength = wordMatch.length;
		if (wordMatch.length < 10) {
			for (var i = 0; i < 10; i++) {
				if (typeof wordMatch[i] === "undefined") {
					$scope.wordMatch.push({ word: " " });
				}
			}
		}
	};

	/*
     * returns the count of words in the word list
     */
	$scope.matchLength = function() {
		if (
			$scope.wordMatch[0].word == "Select one or more IPA codes" ||
			$scope.wordMatch[0].word == "No results found"
		) {
			return 0;
		} else {
			return $scope.listLength;
		}
	};

	$scope.advancedSearch = function() {
		if ($scope.selectedLetters.length == 0) {
			$scope.selectedLetters = [{ display: " " }];
		}

		if ($scope.selectedLetters2.length == 0) {
			$scope.selectedLetters2 = [{ display: " " }];
		}

		if ($scope.selectedLetters3.length == 0) {
			$scope.selectedLetters3 = [{ display: " " }];
		}

		if (advancedSearch) {
			advancedSearch = false;
			if ($scope.selectedLetters[0].display == " ") {
				$scope.selectedLetters = [];
			}

			$(".select1").removeClass("disable");
			$(".select2").addClass("disable");
			$(".select3").addClass("disable");

			selected = 1;
		} else {
			advancedSearch = true;
		}
	};

	$scope.activate1 = function() {
		$(".select1").removeClass("disable");
		$(".select2").addClass("disable");
		$(".select3").addClass("disable");
		selected = 1;
	};

	$scope.activate2 = function() {
		if ($scope.selectedLetters[0].display != " ") {
			$(".select1").addClass("disable");
			$(".select2").removeClass("disable");
			$(".select3").addClass("disable");
			selected = 2;
		} else {
			$("#alert").html(
				'<div id="alert"><div id="fade" class="alert alert-danger alert-dismissable fade in" style="font-size:small"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>Use first list</div></div>'
			);
			setTimeout(function() {
				$("#fade")
					.fadeTo(1000, 0)
					.slideUp(1000, function() {
						$(this).remove();
					});
			}, 2000);
		}
	};

	$scope.activate3 = function() {
		if ($scope.selectedLetters2[0].display != " ") {
			$(".select1").addClass("disable");
			$(".select2").addClass("disable");
			$(".select3").removeClass("disable");
			selected = 3;
		} else {
			$("#alert").html(
				'<div id="alert"><div id="fade" class="alert alert-danger alert-dismissable fade in" style="font-size:small"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>Use second list</div></div>'
			);
			setTimeout(function() {
				$("#fade")
					.fadeTo(1000, 0)
					.slideUp(1000, function() {
						$(this).remove();
					});
			}, 2000);
		}
	};

	$scope.confirmCombine = function(index) {
		if (selected == 1) {
			$scope.confirmCombineAux(index, selectedLetters);
			$scope.selectedLetters = selectedLetters;
		} else if (selected == 2) {
			$scope.confirmCombineAux(index, selectedLetters2);
			$scope.selectedLetters2 = selectedLetters2;
		} else if (selected == 3) {
			$scope.confirmCombineAux(index, selectedLetters3);
			$scope.selectedLetters3 = selectedLetters3;
		}
	};

	$scope.confirmCombineAux = function(index, selectedList) {
		if (selectedList[index + 1].display != " ") {
			var pattern =
				selectedList[index].pattern + selectedList[index + 1].pattern;
			var phoneme =
				"/" +
				selectedList[index].phoneme.substring(
					selectedList[index].phoneme.indexOf("/") + 1,
					selectedList[index].phoneme.lastIndexOf("/")
				) +
				selectedList[index + 1].phoneme.substring(
					selectedList[index + 1].phoneme.indexOf("/") + 1,
					selectedList[index + 1].phoneme.lastIndexOf("/")
				) +
				"/";
			selectedList[index] = {
				display: pattern + " = " + phoneme,
				gpc: selectedList[index].gpc + " " + selectedList[index + 1].gpc,
				pattern: pattern,
				phoneme: phoneme,
			};
			$scope.history.unshift(selectedList[index]);
			selectedList.splice(index + 1, 1);

			$("#alert").html(
				'<div id="alert"><div id="fade" class="alert alert-success alert-dismissable fade in" style="font-size:small"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>Combined!</div></div>'
			);
			setTimeout(function() {
				$("#fade")
					.fadeTo(1000, 0)
					.slideUp(1000, function() {
						$(this).remove();
					});
			}, 2000);
		}
	};

	/*
     * change sort to descending/ascending alphabetical order
     */
	$scope.sortAlpha = function() {
		if (alphaDes) {
			wordMatch.sort(compareWordAsc);
			alphaDes = false;
			freqDes = false;
		} else {
			wordMatch.sort(compareWordDes);
			alphaDes = true;
			freqDes = false;
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
		} else {
			wordMatch.sort(compareFreqDes);
			freqDes = true;
			alphaDes = false;
		}
	};

	$scope.sort = function(index) {
		if (index == 1) {
			wordMatch.sort(compareFreqDes);
			doc.getElementsByClassName("disabled")[0].className = " ";
			doc.getElementById("sort1").className = "disabled";
		} else if (index == 2) {
			wordMatch.sort(compareFreqAsc);
			doc.getElementsByClassName("disabled")[0].className = " ";
			doc.getElementById("sort2").className = "disabled";
		} else if (index == 3) {
			wordMatch.sort(compareWordDes);
			doc.getElementsByClassName("disabled")[0].className = " ";
			doc.getElementById("sort3").className = "disabled";
		} else if (index == 4) {
			wordMatch.sort(compareWordAsc);
			doc.getElementsByClassName("disabled")[0].className = " ";
			doc.getElementById("sort4").className = "disabled";
		}
	};

	$scope.resetPhonemes = function() {
		//empty phoneme grid
		$scope.phonemeRows = [];
		maxRows = 3;
		maxCols = 4;
		count = 0;
		for (var i = 0; i < maxRows; i++) {
			$scope.phonemeRows.push([]);
			for (var j = 0; j < maxCols; j++) {
				$scope.phonemeRows[i][j] = { sound: " " };
				count++;
			}
		}
	};
});

// comparator to sort word list in alphabetical descending order
function compareWordDes(a, b) {
	if (a.word < b.word) return -1;
	if (a.word > b.word) return 1;
	return 0;
}

// comparator to sort word list in alphabetical ascending order
function compareWordAsc(a, b) {
	if (a.word > b.word) return -1;
	if (a.word < b.word) return 1;
	return 0;
}

// comparator to sort word list by descending frequency
function compareFreqDes(a, b) {
	return b.freq - a.freq;
}

// comparator to sort word list by ascending frequency
function compareFreqAsc(a, b) {
	return a.freq - b.freq;
}

function optionsClick() {
	$("#collapseOne").collapse("show");
	$("#collapseTwo").collapse("hide");
}

function listClick() {
	$("#collapseOne").collapse("hide");
	$("#collapseTwo").collapse("show");
}
