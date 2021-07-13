
var video;
var opticalFlow;

var cameraWidth = 128;
var cameraHeight = 72;

var resX;
var resY;

var step = 2;
var winStep = step * 2 + 1;
var debug = false;
var sensitivity = 1;

var particlesArr = [];
var particleNum = 1000;

var flowfield;


function setup() {
    createCanvas(windowWidth, windowHeight,[WEBGL]);
    resX = width/cameraWidth;
    resY = height/cameraHeight;
    video = createCapture({
        audio: false,
        video: {
            width: cameraWidth,
            height: cameraHeight
        }
  }, function() {
      console.log('Capture Ready.')
  });

  console.log("Camera:",cameraWidth,"x",cameraHeight);
  console.log("particlesArr:", particleNum);

  video.elt.setAttribute('playsinline', '');
  video.hide();
  opticalFlow = new OpticalFlow(step);

  for(let i = 0;i<particleNum;i++){
      particlesArr.push(new Particle(random(width),random(height)));  
  }

  // Vector Field
  flowfield = new Field(); 
  flowfield.update();

  background(0);

}

function draw() {
//   background(0);
    fill('rgba(0,0,0, 0.5)')
    rect(0,0,width,height);
    noStroke();
 
  push();
  translate(width,0);
  scale(-1, 1);
//   image(video,0,0);

colCounter += 1;
  opticalFlow.update(video);
//   opticalFlow.debugDraw();

flowfield.update();
colorChange(); 


  for(let i = 0;i<particlesArr.length;i++){
    let dot = particlesArr[i];

    if (opticalFlow.flow.flow && opticalFlow.flow.flow.u != 0 && opticalFlow.flow.flow.v != 0) {
        opticalFlow.flow.flow.zones.forEach((zone) => {
        if(abs(zone.u) >= sensitivity && abs(zone.y) >= sensitivity){
        // if motion strong enough
        if(dot.pos.x >= zone.x*resX && dot.pos.x <= zone.x*resX + winStep*resX){
        if(dot.pos.y >= zone.y*resY && dot.pos.y <= zone.y*resY + winStep*resY ){
        //if particles in flow zone
            let userFlow = createVector(zone.u,zone.v);
            dot.applyForce(userFlow);
    }}}})}

    dot.follow(flowfield);
    dot.update();
    dot.edges();
    dot.display();
    }
    
    pop();

    // Framerate
    // fill(102, 255, 51);
    // noStroke();
    // textSize(30);
    // text(floor(frameRate()), 10, 30);
}


var colCounter = 0; // color change counter
var themeCounter = 0;
var themeCounter2 = 1;
var LerpCounter = 0.01;

var colors = [];
colors[0] = ['#ff3399', '#ff99cc', '#ff1a75', '#ffb3d1']; // SAKURA 
colors[1] = ['#3E16A3', '#4E2F9B', '#BBA7E2', '#F3B4FF'];// PURP
colors[2] = ['#0E36D3', '#D1EDFF', '#8CD1FF', '#4A65D3']; // ICE
colors[3] = ['#5DFDCB', '#A0DDFF', '#77FF94', '#72FFE7'];// ALGAE 
colors[4] = ['#F2DCAE', '#FFAF05', '#F9BC39', '#D89911'];// GOLD
colors[5] = ['#E1E2EF', '#97A7B3', '#464655', '#B0C0BC'];// WHITE 
colors[6] = ['#CA054D', '#540D6E', '#4A154B', '#C48ED0'];// DARK PINK
colors[7] = ['#D91028', '#FFE38E', '#D91028', '#EA415C'];// FIRE

function colorChange() {
    if (colCounter >= 500) {
      colCounter = 0;
      LerpCounter = 0;
      themeCounter += 1;
      themeCounter2 += 1;
    }
    LerpCounter+=0.01;
    if (themeCounter==colors.length-1) {
      themeCounter2 = 0;
    }
    if (themeCounter== colors.length) {
      themeCounter = 0;
    }
  }

class Particle{
    constructor(x,y){
        this.pos = createVector(x,y);
        this.vel = createVector(0,0);
        this.acc = createVector(0,0);
        this.prevPos = this.pos.copy();

        this.c1 =floor(random(0, 4));
        this.c2 =floor(random(0, 4));
        this.c;
    }

    setColor() {
        let color1 = color(colors[themeCounter][this.c1]);
        let color2 = color(colors[themeCounter2][this.c2]);
        this.c = lerpColor(color1, color2, LerpCounter);
      }

    display() {
        push();
        strokeWeight(1);
        stroke(this.c);
        line(this.pos.x,this.pos.y,this.prevPos.x,this.prevPos.y);
        this.trail();
        pop();
    }
    update(){
        this.vel.add(this.acc);
        this.vel.mult(0.93);
        this.pos.add(this.vel);
        this.acc.mult(0);
        this.setColor();
    }
    trail(){
        this.prevPos = this.pos.copy();
    }
    follow(flowfield) {
        let x = floor(this.pos.x/fieldRes);
        let y = floor(this.pos.y/fieldRes);
        let index = x + y * flowfield.cols;
        let noiseForce = flowfield.vectors[index];
        noiseForce.mult(0.1);
        this.applyForce(noiseForce);
      }
    edges(){
        stroke(0);
        if(this.pos.x>=width){this.pos.x=1;this.trail()};
        if(this.pos.x<=0){this.pos.x=width;this.trail()};
        if(this.pos.y>=height){this.pos.y=1;this.trail()};
        if(this.pos.y<=0){this.pos.y=height;this.trail()};
        stroke(255);
    }
    applyForce(f){
        f.mult(1.2);
        this.acc.add(f);
    }
}



var fieldRes = 12; 
var zoff = 0;

class Field {
  constructor() {
    this.cols = floor(width / fieldRes)+1;
    this.rows = floor(height / fieldRes)+1;
    this.vectors = [this.cols*this.rows];
  }

    update() {
    let xoff = 0;
    for (let y = 0; y < this.rows; y++) {
      let yoff = 0;
      for (let x = 0; x < this.cols; x++) {
        let angle = noise(xoff, yoff, zoff) * TWO_PI*4;
        var v = p5.Vector.fromAngle(angle);
        let index = x + y * this.cols;
        this.vectors[index] = v;
        yoff += 0.1;
      }
      xoff += 0.1;
    }
    zoff+=0.005;
  }
}
