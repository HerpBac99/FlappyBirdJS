/*
*   Each BG ressource is an instance of ParallaxBg.
*   Its attributes are getted in a json ressource.
*   Basicaly, each ParallaxBg have a pic ressource, a size, a pos, a speed and a type (day or night)
*/
define(function() {

  var SMOOTH_DAY_NIGHHT_TRANSITION_DURATION = 2000;

  function ParallaxBg (dayRessource, nightRessource, width, height, speed, posY, screenWidth) {
    this.dPic       = dayRessource;
    this.nPic       = nightRessource;
    this.speed      = speed;
    this.posY       = posY;
    this.posX       = 0;
    this.width      = width;
    this.height     = height;
    this.maxW       = screenWidth;
    
    this.nightCycle         = false;
    this.isCalcOpacity      = false;
    this.nightOpacity       = 0;
    this.changeOpacityTime  = 0;
  }

  ParallaxBg.prototype.draw = function (ctx, time, isNight) {
    if (!ctx || !this.width || !this.height) {
        return;
    }

    // Обновляем позицию фона
    this.posX = (this.posX - this.speed) % this.width;

    // Нам нужно нарисовать несколько копий фона, чтобы заполнить экран
    var drawPos = this.posX;
    
    try {
        while (drawPos < this.maxW) {
            // Рисуем дневной фон
            if (this.dPic) {
                ctx.drawImage(
                    this.dPic,
                    0, 0,                    // Источник X, Y
                    this.width, this.height, // Ширина и высота источника
                    drawPos, this.posY,      // Позиция отрисовки
                    this.width, this.height  // Размер отрисовки
                );
            }
            
            // Если есть ночной фон и включен ночной режим
            if (this.nPic && isNight) {
                ctx.save();
                ctx.globalAlpha = this.nightOpacity;
                ctx.drawImage(
                    this.nPic,
                    0, 0,
                    this.width, this.height,
                    drawPos, this.posY,
                    this.width, this.height
                );
                ctx.restore();
            }
            
            drawPos += this.width;
        }
    } catch (err) {
        console.error('Ошибка отрисовки фона:', err);
    }
  };

  ParallaxBg.prototype.resetToDayCycle = function () {
    this.nightCycle         = false;
    this.isCalcOpacity      = false;
    this.nightOpacity       = 0;
    this.changeOpacityTime  = 0;
  };

  ParallaxBg.prototype.calcOpacity = function (time, isNight) {
    
    // If there is a change between the previous cycle and now, we have to smoothly recompute night opacity
    if (this.nightCycle != isNight) {
      this.nightCycle = isNight;
      this.isCalcOpacity = true;
      this.changeOpacityTime = 0;

      console.log('Switching background to ' + ((this.nightCycle == true) ? 'night' : 'day'));
    }

    // If we are in a change
    if (this.isCalcOpacity == true) {
      // Update our opacity counter
      this.changeOpacityTime += time;
      this.nightOpacity = this.changeOpacityTime / SMOOTH_DAY_NIGHHT_TRANSITION_DURATION;

      // Stop computing opacity if the transition is done
      if (this.changeOpacityTime >= SMOOTH_DAY_NIGHHT_TRANSITION_DURATION) {
        this.isCalcOpacity = false;
        this.nightOpacity = (this.nightCycle == true) ? 1 : 0;
        this.changeOpacityTime = 0;
      }

      // According to the cycle, adjust opacity
      if (this.nightCycle == false)
        this.nightOpacity = 1 - this.nightOpacity;
    }

  }

  return (ParallaxBg);
});