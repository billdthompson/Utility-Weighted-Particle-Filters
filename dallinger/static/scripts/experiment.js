var trial = 0;
var lock = true;
is_practice = true;
var my_node_id;
var generation;
var proportionBlue;
var global_condition = localStorage.getItem("condition");
if (global_condition==1){
  var global_str = 'yellow gain'
  var yellowStr = 'gold'
  var blueStr = 'water'
  var instructionsText = 'Is there more gold or more water?'
  $('#instructions').html(instructionsText)
  $('#more-blue').html('Water')
  $('#more-yellow').html('Gold')
} else if (global_condition==2){
  var global_str = 'blue gain'
  var yellowStr = 'sand'
  var blueStr = 'water'
  var instructionsText = 'Is there more water or more sand?'
  $('#instructions').html(instructionsText)
  $('#more-blue').html('Water')
  $('#more-yellow').html('Sand')
} else if (global_condition==3){
  var global_str= 'yellow loss'
  var yellowStr = 'chemical'
  var blueStr = 'water'
  var instructionsText = 'Is there more chemical or more water?'
  $('#instructions').html(instructionsText)
  $('#more-blue').html('Water')
  $('#more-yellow').html('Chemical')
} else if (global_condition==4){
  var global_str= 'blue loss'
  var yellowStr = 'sand'
  var blueStr = 'chemical'      
  var instructionsText = 'Is there more chemical or more sand?'
  $('#instructions').html(instructionsText)
  $('#more-blue').html('Chemical')
  $('#more-yellow').html('Sand')
}

function round(num, places) {
  var multiplier = Math.pow(10, places);
  return Math.round(num * multiplier) / multiplier;
}

if (global_str.indexOf('gain')!=-1){
  var total_pay = 0
} else {
  var total_pay = 4
}

total_str = total_pay.toFixed(2)
$('#total_earnings').html('Total earnings: $'+ total_str)



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
    // $("#total-trial-number").html(5);
    if (trial <= num_practice_trials) {
      $("#practice-trial").html("This is a practice trial");
      is_practice = true
    } else {
      $("#practice-trial").html("This is NOT a practice trial");
      is_practice = false
    }

    if(generation == 0) {
      learning_strategy = "asocial";
    } else {
      learning_strategy = "social";
    }

    // Show the participant the stimulus.
    if (learning_strategy === "asocial") {
      $("#instructions").text(instructionsText);

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
      $("#instructions").html(instructionsText);

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
  height = 300;
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

function getBlueDots(state){
  return Math.round(state * numDots)
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
        var condition= 'blue loss'      
      } else {
        console.log(condition)
      }
      true_color = correctStr()
      getBonusAmount(true_color,color,condition)
  });
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




function getBonusAmount(truth,response,condition){
    // truth is a string: 'yellow' or 'blue'
  // response also a string: 'yellow' or 'blue'
  // condition a string: 'yellow gain', 'yellow loss', ect.
  
  if (truth == 'yellow'){
    if (response=="yellow"){
        var accuracy_bonus = 0.2;
    } else {                                                           
        var accuracy_bonus = 0;
    }
  } else {
      if (response == "blue"){
          var accuracy_bonus = 0.2;
      } else {
          var accuracy_bonus = 0;
      }
  }

  var numBlue = getBlueDots(state);
  var numYellow = 80-numBlue;
    if (condition.indexOf('yellow') != -1){
      if (condition.indexOf('gain') != -1){
        // yellow gain
        var dotStr = 'This area has <span>' + numYellow + '</span> gold deposits'
        var condition_bonus = round((numYellow/2)*0.01,2);
      }
      else{
        // yellow loss
        var dotStr = 'This area has <span>' + numYellow + '</span> chemical spills'
        var condition_bonus = -1*round((numYellow/2)*0.01,2);
      }
    } else{
      if (condition.indexOf('gain') != -1){
        // blue gain, truth=yellow
        var dotStr = 'This area has <span>' + numBlue + '</span> water deposits'
        var condition_bonus = round((numBlue/2)*0.01,2);
      }
      else {
        // blue loss, truth=yellow
        var dotStr = 'This area has <span>' + numBlue + '</span> chemical spills'
        var condition_bonus = -1*round((numBlue/2)*0.01,2);
      }
    }

  if (is_practice){
    var total_pay = 0

  } else {
    var total_pay = accuracy_bonus+condition_bonus
  }

  dallinger.createInfo(my_node_id, 
    {contents: JSON.stringify({bonus:total_pay}),info_type: 'trialbonus'})
  .done(function (resp) {updateResponseHTML(truth,response,condition,dotStr,accuracy_bonus,condition_bonus)})
}



function updateResponseHTML(truth,response,condition,dotStr,accuracy_bonus,condition_bonus){

  if (condition.indexOf('loss')!=-1){
    $(".outcome").html("<div class='titleOutcome'>"+
    "<p class = 'computer_number' id = 'topResult'>This area has more </p> " +
    "<p class = 'computer_number' id = 'responseResult'> You said it has more </p> " +
    "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus: </p> &nbsp;" +
    "<p class = 'computer_number' id = 'numDots'></p                                 >" + 
    "<p class = 'computer_number' id = 'goodAreaPay'>Cleaning cost: </p> &nbsp;" + 
    "<hr class='hr_block'>"+
    "<p class = 'computer_number' id = 'total'> Total area earnings: </p>" +
    "</div>")

  } else {
    $(".outcome").html("<div class='titleOutcome'>"+
    "<p class = 'computer_number' id = 'topResult'>This area has more </p> " +
    "<p class = 'computer_number' id = 'responseResult'> You said it has more </p> " +
    "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus: </p> &nbsp;" +
    "<p class = 'computer_number' id = 'numDots'></p>" + 
    "<p class = 'computer_number' id = 'goodAreaPay'>Area bonus: </p> &nbsp;" + 
    "<hr class='hr_block'>"+
    "<p class = 'computer_number' id = 'total'> Total area earnings: </p>" +
    "</div>")
                                                                                  
  }

  if (response=='yellow'){
      responseStr = yellowStr
    } else{
      responseStr = blueStr
  }

  if (truth.indexOf('yellow')!=-1){
    var true_state = yellowStr
      } else{
    var true_state = blueStr
  }

  if (accuracy_bonus>=0){
    accuracyStr = '$' + accuracy_bonus.toFixed(2)
  } else {
    accuracyStr = '-$' + Math.abs(accuracy_bonus).toFixed(2)
  }

  if (condition_bonus>=0){
    conditionStr = '$' + condition_bonus.toFixed(2)
  } else {
    conditionStr = '$' + Math.abs(condition_bonus).toFixed(2)
  }

  if (accuracy_bonus+condition_bonus>=0){
    netStr = '$' + (accuracy_bonus+condition_bonus).toFixed(2)
  } else {
    netStr = '-$' + (Math.abs(accuracy_bonus+condition_bonus)).toFixed(2)
  }


  total_pay += (accuracy_bonus+condition_bonus)
  total_str = total_pay.toFixed(2)
  $('#total_earnings').html('Total earnings: $'+ total_str)


  var p1_html = document.getElementById('topResult');
  var p2_html = document.getElementById('responseResult');
  var p3_html = document.getElementById('accuracy');
  var p4_html = document.getElementById('numDots');
  var p5_html = document.getElementById('goodAreaPay');
  var p6_html = document.getElementById('total');
  p1_html.innerHTML +=  '<span class = "computer_number">' + true_state + "</span>"
  p2_html.innerHTML += '<span class = "computer_number">' + responseStr + "</span>"
  p3_html.innerHTML += '<span class = "computer_number">' + accuracyStr + "</span>"
  p4_html.innerHTML =  dotStr
  p5_html.innerHTML += '<span class = "computer_number">' + conditionStr + "</span>"
  p6_html.innerHTML += '<span class = "computer_number">' + netStr + "</span>"

  $('.outcome').css('margin','0 auto')
  $('.outcome').css('width','300px')
  $('.outcome').css('text-align','right')
  $(".outcome").css("display", "block");
  $(".button-wrapper").css("text-align", "right");
  $(".button-wrapper").css("display", "block");
  $(".center_div").css("display", "none");
  $('.text_left').css('margin','0 auto')
  $('.text_left').css('width','200px')
  $('.text_left').css('text-align','right') 

  $('#continue_button').click(function(){
    $(".outcome").css("display", "none");
    $(".center_div").css("display", "block");
    $(".button-wrapper").css("display", "none");
    $(".outcome").html("")
    $("#instructions").html("Are there more blue or yellow dots?")
    $("#instructions").show()
    create_agent();
  });


  
};
