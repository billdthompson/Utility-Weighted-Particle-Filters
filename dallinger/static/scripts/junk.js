if (cover_story==true){
    if (payout_condition=='blue'){
        // with story, payout blue
        var greenStr = 'Sand';
        var blueStr = 'Water'
        if (green_first==true){
          var instructionsText = 'Are there more sand dots or more water dots?'
        } else{
          var instructionsText = 'Are there more water dots or more sand dots?'
        }
        $('#instructions').html(instructionsText)
        $('#more-blue').html('Water')
        $('#more-green').html('Sand')
        if (social_condition=='social'){
          var green_filepath = '/static/images/more_sand.jpg'
          var blue_filepath = '/static/images/more_water.jpg'
        } else if (social_condition=='social_with_info'){
          var green_filepath = '/static/images/more_sand_with_info_base_blue.jpg'
          var blue_filepath = '/static/images/more_water_with_info_base_blue.jpg'
        }
      }
    if (payout_condition=='green'){
        // with story, payout green
        var greenStr = 'Gold';
        var blueStr = 'Water'
        if (green_first==true){
          var instructionsText = 'Are there more gold dots or more water dots?'
        } else{
          var instructionsText = 'Are there more water dots or more gold dots?'
        }
        $('#instructions').html(instructionsText)
        $('#more-blue').html('Water')
        $('#more-green').html('Gold')
        if (social_condition=='social'){
          var green_filepath = '/static/images/more_gold.jpg'
          var blue_filepath = '/static/images/more_water.jpg'
        } else if (social_condition=='social_with_info'){
          var green_filepath = '/static/images/more_gold_with_info_base_green.jpg'
          var blue_filepath = '/static/images/more_water_with_info_base_green.jpg'
        }
    }

    if (payout_condition=='no-utility'){
        var greenStr = 'Green';
        var blueStr = 'Blue'
        if (green_first==true){
          var instructionsText = 'Are there more green dots or more blue dots?'
        } else{
          var instructionsText = 'Are there more blue dots or more green dots?'
        } 
        $('#instructions').html(instructionsText)
        $('#more-blue').html('Water')
        $('#more-green').html('Gold')
        if (social_condition=='social'){
            var green_filepath = '/static/images/more_green.jpg'
            var blue_filepath = '/static/images/more_blue.jpg'
          } else if (social_condition=='social_with_info'){
              // F I G U R E   T H I S   O U T !
        }
    }
}

if (cover_story==false){
    // without story
    var greenStr = 'Green';
    var blueStr = 'Blue'
    if (green_first==true){
      var instructionsText = 'Are there more green dots or more blue dots?';
    } else{
      var instructionsText = 'Are there more blue dots or more green dots?'
    }
    $('#instructions').html(instructionsText)
    $('#more-blue').html('Blue')
    $('#more-green').html('Green')
    if (social_condition=='social_with_info'){
        if (payout_condition=='blue'){
          var green_filepath = '/static/images/more_blue_with_info_base_blue.jpg'
          var blue_filepath = '/static/images/more_green_with_info_base_blue.jpg'
        } else if (payout_condition=='green') {
          var green_filepath = '/static/images/more_blue_with_info_base_green.jpg'
          var blue_filepath = '/static/images/more_green_with_info_base_green.jpg'
        } else if (payout_condition='no-utility'){
          // F I G U R E   T H I S   O U T !
        }
      }

    if (social_condition=='social'){
        var green_filepath = '/static/images/more_blue.jpg'
        var blue_filepath = '/static/images/more_green.jpg'
    }
}



if (learning_strategy=='social'){
    if (include_numbers==true){
        if (green_first==true){
            instructionsText += " Numbers in parentheses indicate the number of participants choosing that option in an area with the same number of "+greenStr+" and "+blueStr+" dots."
            $('#instructions').html(instructionsText)
        } else{
            instructionsText += " Numbers in parentheses indicate the number of participants choosing that option in an area with the same number of "+blueStr+" and "+greenStr+" dots."
            $('#instructions').html(instructionsText)
        }
    }
}