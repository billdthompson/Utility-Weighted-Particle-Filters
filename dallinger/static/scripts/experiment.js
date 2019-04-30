var trial = 0;
is_practice = true;
var my_node_id;
var generation;
var proportionBlue;
var global_condition = localStorage.getItem("condition");
var sampleArray = [0.4625,0.475,0.4875,0.4625,0.475,0.4875,0.5375,0.525,0.5125,0.5375,0.525,0.5125]
var noStory = false;
function sampleWithoutReplacement(input_array) {
  var randomIndex = Math.floor(Math.random()*input_array.length);
  return input_array.splice(randomIndex, 1)[0];
}

if (global_condition==1){
  var global_str = 'yellow gain'
  var yellowStr = 'gold'
  var blueStr = 'water'
  var instructionsText = 'Are there more gold dots or more water dots?'
  $('#instructions').html(instructionsText)
  $('#more-blue').html('Water')
  $('#more-yellow').html('Gold')
} else if (global_condition==2){
  var global_str = 'blue gain'
  var yellowStr = 'sand'
  var blueStr = 'water' 
  var instructionsText = 'Are there more water dots or more sand dots?'
  $('#instructions').html(instructionsText)
  $('#more-blue').html('Water')
  $('#more-yellow').html('Sand')
} else if (global_condition==3){
  var global_str= 'yellow loss'
  var yellowStr = 'chemical'
  var blueStr = 'water'
  var instructionsText = 'Are there more chemical dots or more water dots?'
  $('#instructions').html(instructionsText)
  $('#more-blue').html('Water')
  $('#more-yellow').html('Chemical')
} else if (global_condition==4){
  var global_str= 'blue loss'
  var yellowStr = 'sand'
  var blueStr = 'chemical'      
  var instructionsText = 'Are there more chemical dots or more sand dots?'
  $('#instructions').html(instructionsText)
  $('#more-blue').html('Chemical')
  $('#more-yellow').html('Sand')
}

if (noStory==true){
  if (global_condition==3){
    var global_str= 'yellow loss'
    var yellowStr = 'yellow dots'
    var blueStr = 'blue dots'
    var instructionsText = 'Are there more yellow dots or more blue dots?'
    $('#instructions').html(instructionsText)
    $('#more-blue').html('Blue')
    $('#more-yellow').html('Yellow')
  } else if (global_condition==4){
    var global_str= 'blue loss'
    var yellowStr = 'yellow dots'
    var blueStr = 'blue dots'
    var instructionsText = 'Are there more yellow dots or more blue dots?'
    $('#instructions').html(instructionsText)
    $('#more-blue').html('Blue')
    $('#more-yellow').html('Yellow')
  }

}

function round(num, places) {
  var multiplier = Math.pow(10, places);
  return Math.round(num * multiplier) / multiplier;
}

if (global_str.indexOf('gain')!=-1){
  var total_pay = 0.25
} else {
  var total_pay = 4
}

total_str = total_pay.toFixed(2)
$('#total_earnings').html('Total earnings: $'+ total_str)

create_agent = function() {
  // if this is the first trial, then dallinger.createAgent has already been 
  // called by instruct
  if (trial == 0){
    my_node_id = localStorage.getItem("my_node_id");
    generation = localStorage.getItem("generation");
    condition = localStorage.getItem("condition"); 
    get_received_infos();
  }
  else {
    // console.log("Calling createAgent")
    dallinger.createAgent()
    .done(function (resp) {
      my_node_id = resp.node.id;
      generation = resp.node.property2;
      get_received_infos();
    })
    .fail(function (resp) {
      dallinger.goToPage('questionnaire');
    });

  }
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
    $(".center_div").css("display", "block");
    $("#instructions").show()
    if (trial <= num_practice_trials) {
      $("#practice-trial").html("This is a practice trial");
      is_practice = true
    } else {
      $("#practice-trial").html("This is NOT a practice trial");
      is_practice = false
    }

    var learning_strategy = "asocial";
    // if(generation == 0) {
    //   learning_strategy = "asocial";
    // } else {
    //   learning_strategy = "social";
    // }

    // Show the participant the stimulus.
    if (learning_strategy === "asocial") {
      $("#instructions").text(instructionsText);

      //proportionBlue = parseFloat(state)
      proportionBlue = sampleWithoutReplacement(sampleArray)
      //console.log("problue: ", proportionBlue)
      regenerateDisplay(proportionBlue);

      $("#more-blue").addClass('disabled');
      $("#more-yellow").addClass('disabled');

      presentDisplay();

      $("#stimulus-stage").show();
      $("#response-form").hide();
      $("#more-yellow").show();
      $("#more-blue").show();
    }

    // // Show the participant the hint.
    // if (learning_strategy === "social") {
    //   $("#instructions").html(instructionsText);

    //   $("#more-blue").addClass('disabled');
    //   $("#more-yellow").addClass('disabled');

    //   if (meme === "blue") {
    //     $("#stimulus").attr("src", "/static/images/blue_social.jpg");
    //   } else if (meme === "yellow") {
    //     $("#stimulus").attr("src", "/static/images/yellow_social.jpg");
    //   }
    //   $("#stimulus").show();
    //   setTimeout(function() {
    //     $("#stimulus").hide();
    //     $("#more-blue").removeClass('disabled');
    //     $("#more-yellow").removeClass('disabled');
    //   }, 2000);
    // }
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
    // console.log("clearing paper")
    paper.clear();
  }, 1000);
}

function regenerateDisplay (propBlue) {
  // Display parameters
  width = 600;
  height = 300;
  numDots = 80;
  dots = [];
  blueDots = Math.round(propBlue * numDots);
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

function getBlueDots(propBlue){
  return Math.round(propBlue * numDots)
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
  paper.clear();
  $("#more-blue").addClass('disabled');
  $("#more-yellow").addClass('disabled');
  $("#reproduction").val("");
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
    // console.log(condition)
  }
  true_color = correctStr()
  bonuses=getBonusAmount(true_color,color,condition)
  accuracy_b = bonuses[0]
  condition_b = bonuses[1]
  dotStr = bonuses[2]
  if (is_practice==false){
    total_pay += (accuracy_b+condition_b)
  }

  var contents = {choice:color,
                  is_practice:is_practice,
                  proportionBlue:proportionBlue,
                  condition:localStorage.getItem("condition"),
                  running_total_bonus:total_pay,
                  current_bonus: accuracy_b+condition_b,
                  participant_id: dallinger.identity.participantId}

  dallinger.createInfo(my_node_id, {
    contents: JSON.stringify(contents),
    info_type: 'Meme'
  }).done(function (resp) {
      $("#more-blue").removeClass('disabled');
      $("#more-yellow").removeClass('disabled');
      $("#instructions").html("")
      $("#instructions").hide()
      updateResponseHTML(true_color,color,condition,dotStr,accuracy_b,condition_b)
  });
};

$(document).ready(function() {
  $("#more-yellow").click(function() {
    // console.log("Reported more yellow.");
    report("yellow");
  });

  $("#more-blue").click(function() {
    // console.log("Reported more blue.");
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

  var numBlue = getBlueDots(proportionBlue);
  var numYellow = 80-numBlue;
    if (condition.indexOf('yellow') != -1){
      if (condition.indexOf('gain') != -1){
        // yellow gain
        var dotStr = 'This area has <span>' + numYellow + '</span> gold deposits'
        var condition_bonus = round((numYellow/2)*0.01,2);
      }
      else{
        if (noStory==true){
          var dotStr = 'This image has <span>' + numYellow + '</span> yellow dots'
        } else{
          var dotStr = 'This area has <span>' + numYellow + '</span> chemical spills'
        }
        // yellow loss
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
        if (noStory==true){
          var dotStr = 'This image has <span>' + numBlue + '</span> blue dots'
        } else{
          var dotStr = 'This area has <span>' + numBlue + '</span> chemical spills'
        }
        var condition_bonus = -1*round((numBlue/2)*0.01,2);
      }
    }
    return [accuracy_bonus,condition_bonus,dotStr]

  }



function updateResponseHTML(truth,response,condition,dotStr,accuracy_bonus,condition_bonus){

  if (condition.indexOf('loss')!=-1){
    if (condition.indexOf('yellow')!=-1){
      $(".outcome").html("<div class='titleOutcome'>"+
      "<p class = 'computer_number' id = 'topResult'>This area has more </p> " +
      "<p class = 'computer_number' id = 'responseResult'> You said it has more </p> " +
      "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus: </p> &nbsp;" +
      "<p class = 'computer_number' id = 'numDots'></p                                 >" + 
      "<p class = 'computer_number' id = 'goodAreaPay'>Chemical cleaning cost: </p> &nbsp;" + 
      "<hr class='hr_block'>"+
      "<p class = 'computer_number' id = 'total'> Total area earnings: </p>" +
      "</div>")
    } else if (condition.indexOf('blue')!=-1){
      $(".outcome").html("<div class='titleOutcome'>"+
      "<p class = 'computer_number' id = 'topResult'>This area has more </p> " +
      "<p class = 'computer_number' id = 'responseResult'> You said it has more </p> " +
      "<p class = 'computer_number' id = 'accuracy'> Accuracy bonus: </p> &nbsp;" +
      "<p class = 'computer_number' id = 'numDots'></p                                 >" + 
      "<p class = 'computer_number' id = 'goodAreaPay'>Chemical cleaning cost: </p> &nbsp;" + 
      "<hr class='hr_block'>"+
      "<p class = 'computer_number' id = 'total'> Total area earnings: </p>" +
      "</div>")
    }

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

  $('#continue_button').unbind('click').click(function(){
    if (trial==num_practice_trials){
      $(".outcome").html("")
      $('.outcome').css('text-align','center')
      $(".outcome").html("<div class='titleOutcome'>"+
      "<p class = 'computer_number' id = 'topResult'>You will now complete 10 test trials. Earnings from these rounds will be added " +
      "to your final pay </p> ")
      //$("#topResult").css('font-size','30px')
      $('#continue_button').click(function(){
        $(".outcome").css("display", "none");
        $(".button-wrapper").css("display", "none");
        $(".outcome").html("")
        $("#instructions").html("")
        create_agent();
      });
    } else{
      $(".outcome").css("display", "none");
      $(".button-wrapper").css("display", "none");
      $(".outcome").html("")
      $("#instructions").html("")
      create_agent();
    }
  });


  
};