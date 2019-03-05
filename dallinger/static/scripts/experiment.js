var trial = 0;
var lock = true;
var my_node_id;
var generation;
var proportionBlue;

dallinger.getExperimentProperty('practice_repeats')
  .done(function (resp) {
    num_practice_trials = resp.practice_repeats;
  });

dallinger.getExperimentProperty('experiment_repeats')
  .done(function (resp) {
    num_experiment_trials = resp.experiment_repeats;
  });

create_agent = function() {
  if (trial == 0){
    my_node_id = localStorage.getItem("my_node_id");
    generation = localStorage.getItem("generation");
    condition = localStorage.getItem("condition"); 
    get_received_infos();
  }
  else {
    dallinger.createAgent()
    .done(function (resp) {
      my_node_id = resp.node.id;
      generation = resp.node.property2;
      console.log('resp:', resp)
      get_received_infos();
    })
    .fail(function () {
      dallinger.goToPage('questionnaire');
    });

  }
};

get_infos = function() {
  dallinger.getInfos(my_node_id).done(function (resp) {
    //learning_strategy = resp.infos[0].contents;
    get_received_infos();
  });
};

get_received_infos = function() {
  dallinger.getReceivedInfos(my_node_id).done(function (resp) {
    infos = resp.infos;
    console.log("inside gri: ", resp)
    console.log('generation', generation)
    for (i = 0; i < infos.length; i++) {
      if (infos[i].type == "state") {
        state = infos[i].contents;
      }
      if (infos[i].type == "meme") {
        meme = infos[i].contents;
      }
    }

    trial = trial + 1;
    $("#trial-number").html(trial);
    $("#total-trial-number").html(num_practice_trials + num_experiment_trials);
    if (trial <= num_practice_trials) {
      $("#practice-trial").html("This is a practice trial");
    } else {
      $("#practice-trial").html("This is NOT a practice trial");
    }

    if(generation == 0) {
      learning_strategy = "asocial";
    } else {
      learning_strategy = "social";
    }

    // Show the participant the stimulus.
    if (learning_strategy === "asocial") {
      $("#instructions").text("Are there more blue or yellow dots?");

      proportionBlue = parseFloat(state)
      console.log("problue: ", proportionBlue)
      regenerateDisplay(state);

      $("#more-blue").addClass('disabled');
      $("#more-yellow").addClass('disabled');

      presentDisplay();

      $("#stimulus-stage").show();
      $("#response-form").hide();
      $("#more-yellow").show();
      $("#more-blue").show();
    }

    // Show the participant the hint.
    if (learning_strategy === "social") {
      $("#instructions").html("Are there more blue or yellow dots?");

      $("#more-blue").addClass('disabled');
      $("#more-yellow").addClass('disabled');

      if (meme === "blue") {
        $("#stimulus").attr("src", "/static/images/blue_social.jpg");
      } else if (meme === "yellow") {
        $("#stimulus").attr("src", "/static/images/yellow_social.jpg");
      }
      $("#stimulus").show();
      setTimeout(function() {
        $("#stimulus").hide();
        $("#more-blue").removeClass('disabled');
        $("#more-yellow").removeClass('disabled');
        lock = false;
      }, 2000);
    }
  });
};

function presentDisplay (argument) {
  for (var i = dots.length - 1; i >= 0; i--) {
    dots[i].show();
  }
  setTimeout(function() {
    for (var i = dots.length - 1; i >= 0; i--) {
      dots[i].hide();
    }
    $("#more-blue").removeClass('disabled');
    $("#more-yellow").removeClass('disabled');
    lock = false;
    paper.clear();
  }, 1000);
}

function regenerateDisplay (state) {
  // Display parameters
  width = 600;
  height = 400;
  numDots = 80;
  dots = [];
  blueDots = Math.round(state * numDots);
  yellowDots = numDots - blueDots;
  sizes = [];
  rMin = 10; // The dots' minimum radius.
  rMax = 20;
  horizontalOffset = (window.innerWidth - width) / 2;

  paper = Raphael(horizontalOffset, 300, width, height);

  colors = [];
  colorsRGB = ["#428bca", "#FBB829"];

  for (var i = blueDots - 1; i >= 0; i--) {
    colors.push(0);
  }
  for (i = yellowDots - 1; i >= 0; i--) {
    colors.push(1);
  }

  colors = shuffle(colors);

  while (dots.length < numDots) {
    // Pick a random location for a new dot.
    r = randi(rMin, rMax);
    x = randi(r, width - r);
    y = randi(r, height - r);

    // Check if there is overlap with any other dots
    pass = true;
    for (i = dots.length - 1; i >= 0; i--) {
      distance = Math.sqrt(Math.pow(dots[i].attrs.cx - x, 2) + Math.pow(dots[i].attrs.cy - y, 2));
      if (distance < (sizes[i] + r)) {
        pass = false;
      }
    }

    if (pass) {
      var dot = paper.circle(x, y, r);
      dot.hide();
      // use the appropriate color.
      dot.attr("fill", colorsRGB[colors[dots.length]]); // FBB829
      dot.attr("stroke", "#fff");
      dots.push(dot);
      sizes.push(r);
    }
  }
}

function randi(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(o){
  for (var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
  return o;
}

function correct(color){
  if (color == 'yellow'){
    if (proportionBlue > .5){
      return false
    }

    else {
      return true
    }
  }

  else {
    if (proportionBlue > .5){
      return true
    }

    else {
      return false
    }
  }
};

function correctStr(){
  if (proportionBlue>0.5){
    return 'blue'
  } else{
    return 'yellow'
  }
}

function payoff(color, correct){
  if (correct){
    if (color == 'yellow'){
      return "10"
    }

    else{

      return "50"
    }
  }

  else {
    return "0"
  }

};

report = function (color) {
  if (lock === false) {
    $("#more-blue").addClass('disabled');
    $("#more-yellow").addClass('disabled');
    $("#reproduction").val("");

    dallinger.createInfo(my_node_id, {
      contents: color,
      info_type: 'Meme'
    }).done(function (resp) {
      $("#more-blue").removeClass('disabled');
      $("#more-yellow").removeClass('disabled');
      $("#instructions").html("")
      $("#instructions").hide()
      var condition_var = localStorage.getItem("condition");
      if (condition_var==1){
        var condition = 'yellow gain'
      } else if (condition_var==2){
        var condition = 'blue gain'
      } else if (condition_var==3){
        var condition= 'yellow loss'
      } else if (condition_var==4){
        var condition_var=4
      } else {
        console.log(condition)
      }
      true_color = correctStr()
      updateResponseHTML(true_color,color,condition_var)
      $("#feedback").show()
      setTimeout(function() {
        $("#feedback").html("")
        $("#feedback").hide()
        $("#instructions").html("Are there more blue or yellow dots?")
        $("#instructions").show()
        create_agent();
      }, 3000);
    });
    lock = true;
  }
};

$(document).ready(function() {
  $("#more-yellow").click(function() {
    console.log("Reported more yellow.");
    report("yellow");
  });

  $("#more-blue").click(function() {
    console.log("Reported more blue.");
    report("blue");
  });

  $(document).keydown(function(e) {
    var code = e.keyCode || e.which;
    if(code === 70) { //Enter keycode
      report("blue");
    } else if (code === 74) {
      report("yellow");
    }
  });
});



// Condition 1: 'blue gain' -> Get paid more for blue than than
// Condition 2: 'yellow gain' -> get paid more for yellow than blue
// Condition 3: 'blue loss' -> lose more for blue than yellow
// Condition 4: 'yellow loss' -> lose more for yellow than blue

function updateResponseHTML(truth,response,condition){
  // truth is a string: 'yellow' or 'blue'
  // response also a string: 'yellow' or 'blue'
  // condition a string: 'yellow gain', 'yellow loss', ect.
  if (truth == 'good'){
    if (response=="good"){
        var accuracy_bonus = 1;
        var condition_bonus = 1;
    } else {
        var accuracy_bonus = 0;
        var condition_bonus = 0;
    }
  } else {
      if (truth == "good"){
          var accuracy_bonus = 0;
          var condition_bonus = 1;
      } else {
          var accuracy_bonus = 1;
          var condition_bonus = 0;
      }
  }
  $("#outcome").innerHTML = "<div class='outcome'><div class='titleOutcome'><p class = 'computer_number' id = 'topResult'>" +
  "This area has more </p></div>&nbsp;<div class = 'text_left'><p class = 'computer_number' id = 'accuracy'>"+
  "Accuracy Bonus:</p><p class = 'computer_number' id = 'goodArea'>+ &nbsp;    Good Area Bonus:</p><hr>"+
  "<p class = 'computer_number' id = 'total'>= &nbsp;  Total Bonus:</p></div></div>"

  if (truth=='yellow'){
    // Condition is gold and truth is more gold
    if (condition.indexOf('yellow') != -1){
      if (condition.indexOf('gain') != -1){
        // More gold in gold gain
        condition_bonus = 1
      }
      else{
        // more gold in gold loss
        condition_bonus = -2
      }
    } else{
      // Condition is gold truth is more dirt
      if (condition.indexOf('gain') != -1){
        // More dirt gold gain
        condition_bonus = 0
      }
      else {
        // More gold gold loss
        condition_bonus = -2
      }
    }
  } else if (truth=='blue'){
    // Condition is oil and truth is more oil
    if (condition.indexOf('yellow') != -1){
      if (condition.indexOf('gain') != -1){
        // More sand than oil
        condition_bonus = 0
      }
      else{
        // More sand than oil, loss
        condition_bonus = -1
      }
    } else{
      // Condition is blue truth is blue
      if (condition.indexOf('gain') != -1){
        // Gain condition, more oil than sand
        condition_bonus = 1
      }
      else {
        // Loss condition, more oil than sand
        condition_bonus = -2
      }
    }
  }

  if (truth.indexOf('yellow')!=-1){
    var true_state = "yellow"
      } else{
      var true_state = 'blue'
    }

  var p1_html = document.getElementById('topResult');
  var p2_html = document.getElementById('accuracy');
  var p3_html = document.getElementById('goodArea');
  var p4_html = document.getElementById('total');
  p1_html.innerHTML += '<span class = "computer_number">' + true_state + "</span>"
  p2_html.innerHTML += '<span class = "computer_number">$' + String(accuracy_bonus) + "</span>"
  p3_html.innerHTML += '<span class = "computer_number">$' + String(condition_bonus)+ "</span>"
  p4_html.innerHTML += '<span class = "computer_number">$' + String(accuracy_bonus+condition_bonus)+ "</span>"
  $('.outcome').show();
  };

}
