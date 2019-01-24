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
  dallinger.createAgent()
    .done(function (resp) {
      my_node_id = resp.node.id;
      generation = resp.node.property2;
      get_received_infos();
    })
    .fail(function () {
      dallinger.goToPage('questionnaire');
    });
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
      if (correct(color) == true){
        $("#feedback").html("YOU WERE CORRECT! YOU EARNED +-XYZ POINTS")
      }
      else {
       $("#feedback").html("YOU WERE WRONG! YOU EARNED +-XYZ POINTS")
      }
      $("#feedback").show()
        setTimeout(function() {
          $("#feedback").html("")
          $("#feedback").hide()
          $("#instructions").html("Are there more blue or yellow dots?")
          $("#instructions").show()
          create_agent();
        }, 1000);
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
