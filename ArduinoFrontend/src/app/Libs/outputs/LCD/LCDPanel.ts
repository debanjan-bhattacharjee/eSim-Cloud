import { LCDUtils } from './LCDUtils';
import { MathUtils } from '../../Utils';
import { timingSafeEqual } from 'crypto';

/**
 * LCDPixel: Class prototype for the pixels inside a LCD Character panel
 */
export class LCDPixel {
  /**
   * Index of the parent grid
   */
  parentIndex: [number, number];

  /**
   * Self-index inside the parent grid
   */
  index: [number, number];

  /**
   * x-coordinate of the pixel with respect to the lcd
   */
  posX: number;

  /**
   * y-coordinate of the pixel with respect to the lcd
   */
  posY: number;

  /**
   * width of the pixel
   */
  width: number;

  /**
   * height of the pixel
   */
  height: number;

  /**
   * color of the pixel when it is switched off
   */
  dimColor: string;

  /**
   * color of the pixel when it is switched on
   */
  glowColor: string;

  /**
   * switch status of the pixel: true when on, false when off
   */
  isOn: boolean;

  /**
   * brightness i.e., opacity of the pixel
   */
  brightness: number;

  /**
   * Raphael canvas component of the pixel
   */
  canvas: any;

  /**
   * Boolean flag to store if any changes are pending to be rendered.
   * Pending changes are rendered upon calling the `refresh` method.
   */
  changesPending: boolean;

  /**
   * x-coordinate of the lcd of which the pixel is a part of
   */
  lcdX: number;

  /**
   * y-coordinate of the lcd of which the pixel is a part of
   */
  lcdY: number;

  /**
   * Show/hide status of the pixel
   */
  hidden: boolean;

  /**
   * Blink status of the pixel
   * true when the pixel is hidden while blinking
   * false when the pixel is shown while blinking
   */
  blinkHidden = false;

  constructor(parentIndex: [number, number], index: [number, number], posX: number,
              posY: number, lcdX: number, lcdY: number, width: number, height: number, dimColor: string, glowColor: string) {
    this.parentIndex = parentIndex;
    this.index = index;
    this.posX = posX;
    this.posY = posY;
    this.lcdX = lcdX;
    this.lcdY = lcdY;
    this.width = width;
    this.height = height;
    this.dimColor = dimColor;
    this.glowColor = glowColor;
    this.isOn = false;
    this.brightness = 100;
    this.canvas = null;
    this.changesPending = false;
    this.hidden = false;
  }

  /**
   * @param distance distance by which to shift horizontally
   * @param hidden new state of the pixel
   */
  shift(distance, hidden) {
    this.posX += distance;
    this.canvas.attr({
      x: this.posX + this.lcdX
    });

    // if the state changes, then take it in effect
    if (this.hidden !== hidden) {
      if (hidden) {
        this.hide();
      } else {
        this.show();
      }
    }
  }

  /**
   * Switch the pixel to on/off
   * @param value true to switch on, false to switch off
   */
  switch(value) {
    const prevValue = this.isOn;
    this.isOn = parseInt(value, 2) && true;
    if (prevValue !== this.isOn) {
      this.changesPending = true;
    }
  }

  /**
   * get the color of the pixel
   */
  getColor() {
    return this.isOn ? this.glowColor : this.dimColor;
  }

  /**
   * get the name of the pixel
   */
  getName() {
    return `G:${this.parentIndex[0]}:${this.parentIndex[1]}:${this.index[0]}:${this.index[1]}`;
  }

  /**
   * get the canvas representation of the pixel
   */
  getCanvasRepr() {
    return {
      name: this.getName(),
      type: 'rectangle',
      width: this.width,
      height: this.height,
      x: this.posX,
      y: this.posY,
      fill: this.getColor(),
    };
  }

  /**
   * shows the pixel
   */
  show() {
    this.hidden = false;
    this.canvas.show();
  }

  /**
   * hides the pixel
   */
  hide() {
    this.hidden = true;
    this.canvas.hide();
  }

  /**
   * turn on blinking
   */
  blinkOn() {
    this.blinkHidden = true;
    this.canvas.attr({
      fill: '#000'
    });
  }

  /**
   * turn off blinking
   */
  blinkOff() {
    if (this.blinkHidden && this.canvas) {
      this.canvas.attr({
        fill: this.getColor()
      });
      this.blinkHidden = false;
    }
  }

  /**
   * Refreshes the pixel if changes are pending, else does nothing
   */
  refresh() {
    if (this.changesPending) {
      this.canvas.attr({
        x: this.posX + this.lcdX,
        y: this.posY + this.lcdY,
        fill: this.getColor(),
      });
      this.changesPending = false;
    }
  }
}


export class LCDCharacterPanel {

    N_ROW: number;

    N_COLUMN: number;

    index: [number, number];
    pixels: LCDPixel[][];
    posX: number;
    posY: number;
    lcdX: number;
    lcdY: number;
    pixelWidth: number;
    pixelHeight: number;
    barColor: string;
    barGlowColor: string;
    intraSpacing: number;
    lcdDisplayStartIndex: [number, number];
    lcdDisplayEndIndex: [number, number];
    displayIndex: [number, number];
    hidden: boolean;
    blinkFunction: any;
    containsCursor: boolean;

    shift(distance: number) {
        this.posX += distance;
        this.shiftPixels(distance);
    }

    private shiftPixels(distance: number) {
      for (let i = 0; i < this.N_ROW; i++) {
        for (let j = 0; j < this.N_COLUMN; j++) {
          this.pixels[i][j].shift(distance, this.hidden);
        }
      }
    }

    initialiseLCDPixels() {
      let tempRowsX: number;
      let posX = this.posX;
      let posY = this.posY;

      this.pixels = [[]];
      for (let i = 0; i < this.N_ROW; i++) {
        tempRowsX = posX;
        this.pixels[i] = [];
        for (let j = 0; j < this.N_COLUMN; j++) {
          this.pixels[i][j] = new LCDPixel(
            this.index,
            [i, j],
            posX,
            posY,
            this.lcdX,
            this.lcdY,
            this.pixelWidth,
            this.pixelHeight,
            this.barColor,
            this.barGlowColor
          );
          posX = posX + this.pixelWidth + this.intraSpacing;
        }
        posX = tempRowsX;
        posY = posY + this.pixelHeight +  this.intraSpacing;
      }
    }

    clear() {
      this.changeCursorDisplay(false);
      this.drawCharacter(LCDUtils.getBlankDisplayBytes());
      this.pixels.forEach(pixelRow => pixelRow.forEach(pixel => pixel.refresh()));
      clearInterval(this.blinkFunction);
    }

    drawCharacter(characterDisplayBytes) {
      for (let i = 0; i < this.N_ROW - 1; i++) {
        for (let j = 0; j < this.N_COLUMN; j++) {
          this.pixels[i][j].switch(characterDisplayBytes[i][j]);
        }
      }
    }

    changeCursorDisplay(show: boolean) {
      if (this.containsCursor === show) {
        return;
      }
      for (let j = 0; j < this.N_COLUMN; j++) {
        this.pixels[this.N_ROW - 1][j].switch(show ? 1 : 0);
      }
      if (!show) {
        clearInterval(this.blinkFunction);
      }
      this.containsCursor = show;
    }

    private blink() {
      this.blinkFunction = setInterval(() => {
        this.pixels.forEach(pixelRow => pixelRow.forEach(pixel => {
          if (pixel.blinkHidden) {
            pixel.blinkOff();
          } else {
            pixel.blinkOn();
          }
        }));
      }, 600);
    }

    setBlinking(value: boolean) {
      if (value) {
        this.blink();
      } else if (this.blinkFunction) {
          clearInterval(this.blinkFunction);
          this.blinkFunction = null;
          this.pixels.forEach(pixelRow => pixelRow.forEach(pixel => pixel.blinkOff()));
        }
    }

    getCanvasRepr(): any[] {
      const canvasGrid = [];
      for (const rowPixels of this.pixels) {
        for (const pixel of rowPixels) {
          canvasGrid.push(pixel.getCanvasRepr());
        }
      }
      return canvasGrid;
    }

    constructor(index: [number, number], N_ROW: number, N_COLUMN: number,
                posX: number, posY: number, lcdX: number, lcdY: number,
                pixelWidth: number, pixelHeight: number, barColor: string,
                barGlowColor: string, intraSpacing: number, lcdDisplayStartIndex: [number, number],
                lcdDisplayEndIndex: [number, number], displayIndex: [number, number], hidden: boolean) {
      this.index = index;
      this.N_ROW = N_ROW;
      this.N_COLUMN = N_COLUMN;
      this.posX = posX;
      this.posY = posY;
      this.lcdX = lcdX;
      this.lcdY = lcdY;
      this.pixelHeight = pixelHeight;
      this.pixelWidth = pixelWidth;
      this.barColor = barColor;
      this.barGlowColor = barGlowColor;
      this.intraSpacing = intraSpacing;
      this.lcdDisplayStartIndex = lcdDisplayStartIndex;
      this.lcdDisplayEndIndex = lcdDisplayEndIndex;
      this.displayIndex = displayIndex;
      this.hidden = hidden;
      this.initialiseLCDPixels();
    }
  }
