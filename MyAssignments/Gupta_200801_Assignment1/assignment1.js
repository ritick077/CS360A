////////////////////////////////////////////////////////////////////////
// A simple WebGL program to draw simple 2D shapes with animation.
//

var gl;
var color;
var animation;
var degree0 = 0;
var degree1 = 0;
var matrixStack = [];
var translateDistance = -0.5;
var dir = 1;
var view = 2;

// mMatrix is called the model matrix, transforms objects
// from local object space to world space.
var mMatrix = mat4.create();
var uMMatrixLocation;
var aPositionLocation;
var uColorLoc;

var circleBuf;
var circleIndexBuf;
var sqVertexPositionBuffer;
var sqVertexIndexBuffer;

const vertexShaderCode = `#version 300 es
in vec2 aPosition;
uniform mat4 uMMatrix;

void main() {
  gl_Position = uMMatrix*vec4(aPosition,0.0,1.0);
  gl_PointSize = 2.2;
}`;

const fragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;

uniform vec4 color;

void main() {
  fragColor = color;
}`;

function pushMatrix(stack, m) {
  //necessary because javascript only does shallow push
  var copy = mat4.create(m);
  stack.push(copy);
}

function popMatrix(stack) {
  if (stack.length > 0) return stack.pop();
  else console.log("stack has no matrix to pop!");
}

function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function vertexShaderSetup(vertexShaderCode) {
  shader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(shader, vertexShaderCode);
  gl.compileShader(shader);
  // Error check whether the shader is compiled correctly
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function fragmentShaderSetup(fragShaderCode) {
  shader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(shader, fragShaderCode);
  gl.compileShader(shader);
  // Error check whether the shader is compiled correctly
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function initShaders() {
  shaderProgram = gl.createProgram();

  var vertexShader = vertexShaderSetup(vertexShaderCode);
  var fragmentShader = fragmentShaderSetup(fragShaderCode);

  // attach the shaders
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  //link the shader program
  gl.linkProgram(shaderProgram);

  // check for compilation and linking status
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.log(gl.getShaderInfoLog(vertexShader));
    console.log(gl.getShaderInfoLog(fragmentShader));
  }

  //finally use the program.
  gl.useProgram(shaderProgram);

  return shaderProgram;
}

function initGL(canvas) {
  try {
    gl = canvas.getContext("webgl2"); // the graphics webgl2 context
    gl.viewportWidth = canvas.width; // the width of the canvas
    gl.viewportHeight = canvas.height; // the height
  } catch (e) {}
  if (!gl) {
    alert("WebGL initialization failed");
  }
}

function initSquareBuffer() {
  // buffer for point locations
  const sqVertices = new Float32Array([
    0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
  ]);
  sqVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
  sqVertexPositionBuffer.itemSize = 2;
  sqVertexPositionBuffer.numItems = 4;

  // buffer for point indices
  const sqIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
  sqVertexIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sqIndices, gl.STATIC_DRAW);
  sqVertexIndexBuffer.itemsize = 1;
  sqVertexIndexBuffer.numItems = 6;
}

function drawSquare(color, mMatrix) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

  // buffer for point locations
  gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
  gl.vertexAttribPointer(
    aPositionLocation,
    sqVertexPositionBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // buffer for point indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);

  gl.uniform4fv(uColorLoc, color);

  // now draw the square
  
  if(view==2)
  {
    gl.drawElements(
    gl.TRIANGLES,
    sqVertexIndexBuffer.numItems,
    gl.UNSIGNED_SHORT,
    0
    );
  }
  else if(view == 1){
    gl.drawElements(
        gl.LINE_LOOP,
        sqVertexIndexBuffer.numItems,
        gl.UNSIGNED_SHORT,
        0
        );}  
  else {
    gl.drawArrays(gl.POINTS, 0, sqVertexPositionBuffer.numItems); // show points
    }
}

function initTriangleBuffer() {
  // buffer for point locations
  const triangleVertices = new Float32Array([0.0, 0.5, -0.5, -0.5, 0.5, -0.5]);
  triangleBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
  gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
  triangleBuf.itemSize = 2;
  triangleBuf.numItems = 3;

  // buffer for point indices
  const triangleIndices = new Uint16Array([0, 1, 2]);
  triangleIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangleIndices, gl.STATIC_DRAW);
  triangleIndexBuf.itemsize = 1;
  triangleIndexBuf.numItems = 3;
}

function drawTriangle(color, mMatrix) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

  // buffer for point locations
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    triangleBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // buffer for point indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);

  gl.uniform4fv(uColorLoc, color);

  // now draw the square
  if(view==2)
    {
    gl.drawElements(
    gl.TRIANGLES,
    triangleIndexBuf.numItems,
    gl.UNSIGNED_SHORT,
    0
    );
    }
  else if(view == 1){
    gl.drawArrays(gl.LINE_LOOP, 0, triangleBuf.numItems); // show lines
  }  
  else {
    gl.drawArrays(
        gl.POINTS,
        0,
        triangleBuf.numItems
      ); // show points
  }

}

function initCircleBuffer() {
    const numSegments = 65; // Number of segments to approximate a circle
  
    const circleVertices = [0.0, 0.0]; // Center of the circle
    for (let i = 0; i <= numSegments; i++) {
      const theta = (i / numSegments) * Math.PI * 2;
      const x = Math.cos(theta) * 0.5; // Radius is 0.5
      const y = Math.sin(theta) * 0.5;
      circleVertices.push(x, y);
    }
  
    circleBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circleVertices), gl.STATIC_DRAW);
    circleBuf.itemSize = 2;
    circleBuf.numItems = numSegments;
  
    const circleIndices = [];
    for (let i = 0; i <= numSegments; i++) {
      circleIndices.push(0, i, i + 1);
      circleIndices.push(0, i+1, i + 2);
    }
  
    circleIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(circleIndices), gl.STATIC_DRAW);
    circleIndexBuf.itemsize = 1;
    circleIndexBuf.numItems = numSegments * 6;
  }
  
function drawCircle(color, mMatrix) {
  
      gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  
      // buffer for point locations
      gl.bindBuffer(gl.ARRAY_BUFFER, circleBuf);
      gl.vertexAttribPointer(
        aPositionLocation,
        circleBuf.itemSize,
        gl.FLOAT,
        false,
        0,
        0
      );
    
      // buffer for point indices
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, circleIndexBuf);
    
      gl.uniform4fv(uColorLoc, color);
   
      
    if(view==2)
    {
       gl.drawElements(gl.TRIANGLES, circleIndexBuf.numItems+3, gl.UNSIGNED_SHORT, 0); 
    }
    else if(view == 1){
        gl.drawElements(gl.LINE_LOOP, circleIndexBuf.numItems+3, gl.UNSIGNED_SHORT, 0);// show lines
    }  
    else {
        gl.drawArrays(gl.POINTS, 0, circleBuf.numItems); // show points
    }

  }


function drawTrees() {
    
    //leaf3.1
    pushMatrix(matrixStack, mMatrix);
    color = [0, 153/255, 77/255, 1];
    mMatrix = mat4.translate(mMatrix, [((605-305)+(496-305))/(2*305),((305-157)+(305-252))/(2*305) +0.05, 0.0]);
    mMatrix = mat4.scale(mMatrix, [(605-496)/(1.1*305), (1.732*(605-496))/(2*305*1.1), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //leaf3
    pushMatrix(matrixStack, mMatrix);
    color = [77/255, 179/255, 77/255, 1];
    mMatrix = mat4.translate(mMatrix, [((605-305)+(496-305))/(2*305),((305-142)+(305-236))/(2*305) +0.05, 0.0]);
    mMatrix = mat4.scale(mMatrix, [(605-496)/305, (1.732*(605-496))/(2*305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //tree3
        pushMatrix(matrixStack, mMatrix);
        color = [101/255, 204/255, 77/255, 1];
        mMatrix = mat4.translate(mMatrix, [((550-305)+(492-305)+(608-305))/(3*305),((305-117)+(305-208)+(305-208))/(3*305)+0.05 , 0.0]);
        mMatrix = mat4.scale(mMatrix, [(608-492)/305, (208-117)/305, 1.0]);
        drawTriangle(color, mMatrix);
        mMatrix = popMatrix(matrixStack);

    //leaf2.1
    pushMatrix(matrixStack, mMatrix);
    color = [0, 153/255, 77/255, 1];
    mMatrix = mat4.translate(mMatrix, [((519-305)+(409-305))/(2*305),((305-137)+(305-242))/(2*305) +0.058, 0.0]);
    mMatrix = mat4.scale(mMatrix, [(605-496)/(0.92*305), (1.732*(605-496))/(2*305*0.92), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //leaf2
    pushMatrix(matrixStack, mMatrix);
    color = [77/255, 179/255, 77/255, 1];
    mMatrix = mat4.translate(mMatrix, [((519-305)+(409-305))/(2*305),((305-122)+(305-225))/(2*305) +0.058, 0.0]);
    mMatrix = mat4.scale(mMatrix, [(605-496)/(0.9*305), (1.732*(605-496))/(2*305*0.9), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //tree2
    pushMatrix(matrixStack, mMatrix);
    color = [101/255, 204/255, 77/255, 1];
    mMatrix = mat4.translate(mMatrix, [((519-305)+(409-305))/(2*305),((305-105)+(305-207))/(2*305) +0.058, 0.0]);
    mMatrix = mat4.scale(mMatrix, [(605-496)/(0.85*305), (1.732*(605-496))/(2*305*0.85), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //leaf1.1
    pushMatrix(matrixStack, mMatrix);
    color = [0, 153/255, 77/255, 1];
    mMatrix = mat4.translate(mMatrix, [((414-305)+(326-305))/(2*305),((305-172)+(305-262))/(2*305) +0.076, 0.0]);
    mMatrix = mat4.scale(mMatrix, [(605-496)/(1.1*305), (1.732*(605-496))/(2*305*1.1), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //leaf1
    pushMatrix(matrixStack, mMatrix);
    color = [77/255, 179/255, 77/255, 1];
    mMatrix = mat4.translate(mMatrix, [((414-305)+(326-305))/(2*305),((305-142)+(305-262))/(2*305)+0.076 , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(605-496)/305, (1.732*(605-496))/(2*305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //tree1
    pushMatrix(matrixStack, mMatrix);
    color = [101/255, 204/255, 77/255, 1];
    mMatrix = mat4.translate(mMatrix, [((414-305)+(326-305))/(2*305),((305-123)+(305-262))/(2*305) +0.076, 0.0]);
    mMatrix = mat4.scale(mMatrix, [(608-492)/305, (208-117)/305, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //trunk1
    pushMatrix(matrixStack, mMatrix);
    color = [128/255, 77/255, 77/255, 1];
    mMatrix = mat4.translate(mMatrix, [((364-305)+(376-305))/(2*305),((305-236)+(305-308))/(2*305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(376-364)/305, (308-236)/305, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //trunk2
    pushMatrix(matrixStack, mMatrix);
    color = [128/255, 77/255, 77/255, 1];
    mMatrix = mat4.translate(mMatrix, [((451-305)+(466-305))/(2*305),((305-222)+(305-308))/(2*305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(466-451)/305, (308-222)/305, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //trunk3
    pushMatrix(matrixStack, mMatrix);
    color = [128/255, 77/255, 77/255, 1];
    mMatrix = mat4.translate(mMatrix, [((540-305)+(552-305))/(2*305)+0.01,((305-308)+(305-232))/(2*305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(552-540)/305, (308-232)/305, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

}
function drawMountains() {

    //mountain1
    pushMatrix(matrixStack, mMatrix);
    color = [128/255, 93/255, 66/255, 1];
    mMatrix = mat4.translate(mMatrix, [((-140-305)+(324-305))/(2*305),((305-332)+(305-252))/(2*305), 0.0]);
    // mMatrix = mat4.rotate(mMatrix, degToRad(8), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [(324+140)/(305), (332-252)/(0.8*305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //mountain2
    pushMatrix(matrixStack, mMatrix);
    color = [150/255, 120/255, 82/255, 1];
    mMatrix = mat4.translate(mMatrix, [((-140-305)+(324-305))/(2*305)+0.03,((305-332)+(305-252))/(2*305)-0.02, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(8), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [(324+140)/(1.1*305), (332-252)/(0.7*305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //mountain3
    pushMatrix(matrixStack, mMatrix);
    color = [128/255, 93/255, 66/255, 1];
    mMatrix = mat4.translate(mMatrix, [((-140-305)+(324-305))/(2*305)+0.65,((305-332)+(305-252))/(2*305), 0.0]);
    // mMatrix = mat4.rotate(mMatrix, degToRad(8), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [(324+140)/(0.8*305), (332-252)/(0.56*305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //mountain4
    pushMatrix(matrixStack, mMatrix);
    color = [150/255, 120/255, 82/255, 1];
    mMatrix = mat4.translate(mMatrix, [((-140-305)+(324-305))/(2*305)+0.685,((305-332)+(305-252))/(2*305), 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(8), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [(324+140)/(0.8*305), (332-252)/(0.55*305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //mountain5
    pushMatrix(matrixStack, mMatrix);
    color = [150/255, 120/255, 82/255, 1];
    mMatrix = mat4.translate(mMatrix, [((-140-305)+(324-305))/(2*305)+1.5,((305-332)+(305-252))/(2*305), 0.0]);
    // mMatrix = mat4.rotate(mMatrix, degToRad(8), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [(324+140)/(1.2*305), (332-252)/(0.96*305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}
function drawRoad() {
    //road
    pushMatrix(matrixStack, mMatrix);
    color = [101/255, 179/255, 51/255, 1];
    mMatrix = mat4.rotate(mMatrix, degToRad(-60), [0.0, 0.0, 1.0]);
    mMatrix = mat4.translate(mMatrix, [(226-305+318-305+1450-305)/(3*305),(305-356-1-1)/(3*305)+0.3 , 0.0]);
    
    mMatrix = mat4.scale(mMatrix, [2.7, 1.2, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}
function drawHouse() {
    //roofSquare
    pushMatrix(matrixStack, mMatrix);
    color = [1, 77/255, 0, 1];
    mMatrix = mat4.translate(mMatrix, [((62-305)+(184-305))/(2*305),((305-362)+(305-428))/(2*305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(184-62)/305, (428-362)/305, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [1, 77/255, 0, 1];
    mMatrix = mat4.translate(mMatrix, [((62-305))/(305),((305-362)+(305-428))/(2*305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(62-47)*4.5/305, (428-362)/305, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [1, 77/255, 0, 1];
    mMatrix = mat4.translate(mMatrix, [((184-305))/(305),((305-362)+(305-428))/(2*305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(62-47)*4.5/305, (428-362)/305, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //wall
    pushMatrix(matrixStack, mMatrix);
    color = [229/255, 229/255, 229/255, 1];
    mMatrix = mat4.translate(mMatrix, [((47-305)+(200-305))/(2*305),((305-428)+(305-496))/(2*305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(200-47)/305, (496-428)/305, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //window1
    pushMatrix(matrixStack, mMatrix);
    color = [229/255, 179/255, 2/255, 1];
    mMatrix = mat4.translate(mMatrix, [((66-305)+(89-305))/(2*305),((305-440)+(305-461))/(2*305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(89-66)/305, (461-440)/305, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //window2
    pushMatrix(matrixStack, mMatrix);
    color = [229/255, 179/255, 2/255, 1];
    mMatrix = mat4.translate(mMatrix, [((180-305)+(158-305))/(2*305),((305-440)+(305-461))/(2*305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(180-158)/305, (461-440)/305, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //window2
    pushMatrix(matrixStack, mMatrix);
    color = [229/255, 179/255, 2/255, 1];
    mMatrix = mat4.translate(mMatrix, [((112-305)+(134-305))/(2*305),((305-450)+(305-496))/(2*305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(134-112)/305, (496-450)/305, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);


}
function drawCar() {
    //roofSquare
    pushMatrix(matrixStack, mMatrix);
    color = [204/255, 101/255, 76/255, 1];
    mMatrix = mat4.translate(mMatrix, [((116-305)+(179-305))/(2*305),((305-528)+(305-504))/(2*305)-0.04 , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(179-116)/305, (528-504)/305 +0.08, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //t1
    pushMatrix(matrixStack, mMatrix);
    color = [204/255, 101/255, 76/255, 1];
    mMatrix = mat4.translate(mMatrix, [((116-305))/(305),((305-528)+(305-504))/(2*305) -0.04 , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(60)/305, (528-504)/305+0.08, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //t2
    pushMatrix(matrixStack, mMatrix);
    color = [204/255, 101/255, 76/255, 1];
    mMatrix = mat4.translate(mMatrix, [((179-305))/(305),((305-528)+(305-504))/(2*305) -0.04 , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(60)/305, (528-504)/305+0.08, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //tyre1
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [(111-305)/305, (305-566)/305, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.1, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //tyre1.1
    pushMatrix(matrixStack, mMatrix);
    color = [128/255, 128/255, 128/255, 1];
    mMatrix = mat4.translate(mMatrix, [(111-305)/305, (305-566)/305, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.08, 0.08, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //tyre2
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [(111-305)/305+0.245, (305-566)/305, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.1, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //tyre2.1
    pushMatrix(matrixStack, mMatrix);
    color = [128/255, 128/255, 128/255, 1];
    mMatrix = mat4.translate(mMatrix, [(111-305)/305+0.245, (305-566)/305, 0.0]);
    mMatrix = mat4.scale(mMatrix, [0.08, 0.08, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //bodySquare
    pushMatrix(matrixStack, mMatrix);
    color = [0, 128/255, 229/255, 1];
    mMatrix = mat4.translate(mMatrix, [((83-305)+(212-305))/(2*305),((305-528)+(305-560))/(2*305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(212-83)/305, (560-528)/305, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //t1
    pushMatrix(matrixStack, mMatrix);
    color = [0, 128/255, 229/255, 1];
    mMatrix = mat4.translate(mMatrix, [((83-305))/(305),((305-528)+(305-560))/(2*305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(40)/305, (560-528)/305, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //t2
    pushMatrix(matrixStack, mMatrix);
    color = [0, 128/255, 229/255, 1];
    mMatrix = mat4.translate(mMatrix, [((212-305))/(305),((305-528)+(305-560))/(2*305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(40)/305, (560-528)/305, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

}
function drawGrass() {
    //g1
    pushMatrix(matrixStack, mMatrix);
    color = [2/255, 179/255, 2/255, 1];
    mMatrix = mat4.translate(mMatrix, [((566-305))/(305),((305-432))/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(55)/305, (45)/305, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //g2
    pushMatrix(matrixStack, mMatrix);
    color = [0, 153/255, 0, 1];
    mMatrix = mat4.translate(mMatrix, [((608-305))/(305),((305-425))/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(85)/305, (65)/305, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    
    //g3
    pushMatrix(matrixStack, mMatrix);
    color = [2/255, 179/255, 2/255, 1];
    mMatrix = mat4.translate(mMatrix, [((208-305))/(305),((305-615))/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(65)/305, (35)/305, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    //g4
    pushMatrix(matrixStack, mMatrix);
    color = [0, 102/255, 1/255, 1];
    mMatrix = mat4.translate(mMatrix, [((385-305))/(305),((305-634))/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(80)/305, (60)/305, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    //g5
    pushMatrix(matrixStack, mMatrix);
    color = [0, 153/255, 0, 1];
    mMatrix = mat4.translate(mMatrix, [((300-305))/(305),((305-660))/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(195)/305, (175)/305, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);


    //g6
    pushMatrix(matrixStack, mMatrix);
    color = [2/255, 179/255, 2/255, 1];
    mMatrix = mat4.translate(mMatrix, [((1-305))/(305),((305-483))/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(38)/305, (28)/305, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    //g7
    pushMatrix(matrixStack, mMatrix);
    color = [0, 102/255, 1/255, 1];
    mMatrix = mat4.translate(mMatrix, [((59-305))/(305),((305-481))/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(32)/305, (26)/305, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    //g8
    pushMatrix(matrixStack, mMatrix);
    color = [0, 153/255, 0, 1];
    mMatrix = mat4.translate(mMatrix, [((33-305))/(305),((305-477))/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(55)/305, (40)/305, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //g9
    pushMatrix(matrixStack, mMatrix);
    color = [2/255, 179/255, 2/255, 1];
    mMatrix = mat4.translate(mMatrix, [((190-305))/(305),((305-475))/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(45)/305, (30)/305, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    //g10
    pushMatrix(matrixStack, mMatrix);
    color = [0, 102/255, 1/255, 1];
    mMatrix = mat4.translate(mMatrix, [((270-305))/(305),((305-468))/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(42)/305, (35)/305, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    //g11
    pushMatrix(matrixStack, mMatrix);
    color = [0, 153/255, 0, 1];
    mMatrix = mat4.translate(mMatrix, [((234-305))/(305),((305-465))/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(75)/305, (50)/305, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    
}
function drawSun() {
    //cloud1
    pushMatrix(matrixStack, mMatrix);
    color = [1, 229/255, 1/255, 1];
    mMatrix = mat4.translate(mMatrix, [((94-305))/(305),((305-61))/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(65)/305, (65)/305, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //animation
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [((94-305))/(305),((305-61))/(305)  , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(degree0), [0.0, 0.0, 1.0]);
    mMatrix = mat4.translate(mMatrix, [-((94-305))/(305),-((305-61))/(305) , 0.0]);

    //spoke1
    pushMatrix(matrixStack, mMatrix);
    color = [1, 229/255, 1/255, 1];
    mMatrix = mat4.translate(mMatrix, [((94-305))/(305),((305-61))/(305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(90), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [(95)/305, (2)/305, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //spoke2
    pushMatrix(matrixStack, mMatrix);
    color = [1, 229/255, 1/255, 1];
    mMatrix = mat4.translate(mMatrix, [((94-305))/(305),((305-61))/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(95)/305, (2)/305, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //spoke3
    pushMatrix(matrixStack, mMatrix);
    color = [1, 229/255, 1/255, 1];
    mMatrix = mat4.translate(mMatrix, [((94-305))/(305),((305-61))/(305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(45), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [(95)/305, (2)/305, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //spoke4
    pushMatrix(matrixStack, mMatrix);
    color = [1, 229/255, 1/255, 1];
    mMatrix = mat4.translate(mMatrix, [((94-305))/(305),((305-61))/(305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-45), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [(95)/305, (2)/305, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //animation matrix pop
    mMatrix = popMatrix(matrixStack);


}
function drawClouds() {
    //cloud1
    pushMatrix(matrixStack, mMatrix);
    color = [1, 1, 1, 1];
    mMatrix = mat4.translate(mMatrix, [((50-305))/(305),((305-140))/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(125)/305, (70)/305, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    //cloud1
    pushMatrix(matrixStack, mMatrix);
    color = [1, 1, 1, 1];
    mMatrix = mat4.translate(mMatrix, [((110-305))/(305),((305-148))/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(90)/305, (55)/305, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    //cloud1
    pushMatrix(matrixStack, mMatrix);
    color = [1, 1, 1, 1];
    mMatrix = mat4.translate(mMatrix, [((169-305))/(305),((305-149))/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(65)/305, (40)/305, 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}
function drawRiver() {
    pushMatrix(matrixStack, mMatrix);
    color = [0, 102/255, 1, 1];
    mMatrix = mat4.translate(mMatrix, [0.0,(305-315+305-374)/(2*305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [2, (374-315)/(305), 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [152/255, 184/255, 239/255, 1];
    mMatrix = mat4.translate(mMatrix, [(144-305+42-305)/(2*305),(305-344)/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [120/305, (2)/(305), 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [152/255, 184/255, 239/255, 1];
    mMatrix = mat4.translate(mMatrix, [(256-305+359-305)/(2*305),(305-329)/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [120/305, (2)/(305), 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [152/255, 184/255, 239/255, 1];
    mMatrix = mat4.translate(mMatrix, [(467-305+572-305)/(2*305),(305-365)/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [120/305, (2)/(305), 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

}
function drawBirds() {
    //bird1
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [(346-305)/(305),(305-111)/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [4/305, (6)/(305), 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [(355-305)/(305),(305-106)/(305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(12), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [28/305, (2.5)/(305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [(336-305)/(305),(305-106)/(305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-12), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [28/305, (2.5)/(305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //bird2
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [(258-305)/(305),(305-95)/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [3/305, (5)/(305), 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [(265-305)/(305),(305-91)/(305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(12), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [20/305, (2)/(305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [(250-305)/(305),(305-91)/(305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-12), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [20/305, (2)/(305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //bird3
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [(310-305)/(305),(305-68)/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [2/305, (3)/(305), 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [(317-305)/(305),(305-65)/(305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(12), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [15/305, (1.5)/(305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [(303-305)/(305),(305-65)/(305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-12), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [15/305, (1.5)/(305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //bird4
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [(340-305)/(305),(305-57)/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [1/305, (2)/(305), 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [(344-305)/(305),(305-55)/(305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(12), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [10/305, (1)/(305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [(336-305)/(305),(305-55)/(305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-12), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [10/305, (1)/(305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //bird5
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [(404-305)/(305),(305-64)/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [3/305, (3)/(305), 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [(410-305)/(305),(305-60)/(305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(12), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [18/305, (1.8)/(305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [(398-305)/(305),(305-60)/(305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-12), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [18/305, (1.8)/(305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}
function drawWindmill1() {

    //windmill1
    pushMatrix(matrixStack, mMatrix);
    color = [51/255, 51/255, 51/255, 1];
    mMatrix = mat4.translate(mMatrix, [(505-305)/(305),(305-367)/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [10/305, (160)/(305), 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //animation
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [(505-305)/(305),(305-292)/(305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(degree1), [0.0, 0.0, 1.0]);
    mMatrix = mat4.translate(mMatrix, [-(505-305)/(305),-(305-292)/(305), 0.0]);

    //fin1
    pushMatrix(matrixStack, mMatrix);
    color = [179/255, 179/255, 2/255, 1];
    mMatrix = mat4.translate(mMatrix, [(505-305)/(305),(305-292)/(305) , 0.0]);
    mMatrix = mat4.translate(mMatrix, [0, (66)/(2*305), 1.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(180), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [20/305, (76)/(305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    
    //fin2
    pushMatrix(matrixStack, mMatrix);
    color = [179/255, 179/255, 2/255, 1];
    mMatrix = mat4.translate(mMatrix, [(537-305)/(305),(305-292+305-292)/(2*305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(90), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [20/305, (76)/(305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //fin3
    pushMatrix(matrixStack, mMatrix);
    color = [179/255, 179/255, 2/255, 1];
    mMatrix = mat4.translate(mMatrix, [(472-305)/(305),(305-292+305-292)/(2*305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-90), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [20/305, (76)/(305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //fin4
    pushMatrix(matrixStack, mMatrix);
    color = [179/255, 179/255, 2/255, 1];
    mMatrix = mat4.translate(mMatrix, [(505-305)/(305),(305-292+305-355)/(2*305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [20/305, (76)/(305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    mMatrix = popMatrix(matrixStack);

    //circle1
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [(505-305)/(305),(305-292)/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [16/305, (16)/(305), 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
}
function drawWindmill2() {

    //windmill2
    pushMatrix(matrixStack, mMatrix);
    color = [51/255, 51/255, 51/255, 1];
    mMatrix = mat4.translate(mMatrix, [(154-305)/(305),(305-367)/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [10/305, (160)/(305), 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //animation
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.translate(mMatrix, [(154-305)/(305),(305-292)/(305), 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(degree1), [0.0, 0.0, 1.0]);
    mMatrix = mat4.translate(mMatrix, [-(154-305)/(305),-(305-292)/(305), 0.0]);

    //fin1
    pushMatrix(matrixStack, mMatrix);
    color = [179/255, 179/255, 2/255, 1];
    mMatrix = mat4.translate(mMatrix, [(154-305)/(305),(305-292+305-230)/(2*305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(180), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [20/305, (76)/(305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //fin2
    pushMatrix(matrixStack, mMatrix);
    color = [179/255, 179/255, 2/255, 1];
    mMatrix = mat4.translate(mMatrix, [(186-305)/(305),(305-292+305-292)/(2*305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(90), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [20/305, (76)/(305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //fin3
    pushMatrix(matrixStack, mMatrix);
    color = [179/255, 179/255, 2/255, 1];
    mMatrix = mat4.translate(mMatrix, [(121-305)/(305),(305-292+305-292)/(2*305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-90), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [20/305, (76)/(305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //fin4
    pushMatrix(matrixStack, mMatrix);
    color = [179/255, 179/255, 2/255, 1];
    mMatrix = mat4.translate(mMatrix, [(154-305)/(305), (305-292+305-355)/(2*305), 0.0]);
    mMatrix = mat4.scale(mMatrix, [20/305, (76)/(305), 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //animation matrix pop
    mMatrix = popMatrix(matrixStack);

    //circle2
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [(154-305)/(305),(305-292)/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [16/305, (16)/(305), 1.0]);
    drawCircle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);
    
}
function drawBoat(){

    //boatSquare
    pushMatrix(matrixStack, mMatrix);
    color = [204/255, 204/255, 204/255, 1];
    mMatrix = mat4.translate(mMatrix, [((217-305)+(289-305))/(2*305)+translateDistance,((305-336)+(305-352))/(2*305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(180), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [(283-225)/305, (352-336)/305, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //t1
    pushMatrix(matrixStack, mMatrix);
    color = [204/255, 204/255, 204/255, 1];
    mMatrix = mat4.translate(mMatrix, [((224-305))/(305)+translateDistance,((305-336)+(305-352))/(2*305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(180), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [(16)/305, (352-336)/305, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //t2
    pushMatrix(matrixStack, mMatrix);
    color = [204/255, 204/255, 204/255, 1];
    mMatrix = mat4.translate(mMatrix, [((282-305))/(305)+translateDistance,((305-336)+(305-352))/(2*305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(180), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [(16)/305, (352-336)/305, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //pole
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [((217-305)+(289-305)-30)/(2*305)+translateDistance,((305-302)-3)/(305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-27), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [(1)/305, (69)/305, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //pole
    pushMatrix(matrixStack, mMatrix);
    color = [0, 0, 0, 1];
    mMatrix = mat4.translate(mMatrix, [((217-305)+(289-305))/(2*305)+translateDistance,((305-302))/(305) , 0.0]);
    mMatrix = mat4.scale(mMatrix, [(2.7)/305, (68)/305, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //cloth
    pushMatrix(matrixStack, mMatrix);
    color = [229/255, 77/255, 0, 1];
    mMatrix = mat4.translate(mMatrix, [((217-305)+(289-305)+57.5)/(2*305)+translateDistance,((305-302))/(305) , 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-90), [0.0, 0.0, 1.0]);
    mMatrix = mat4.scale(mMatrix, [(55)/305, (55)/305, 1.0]);
    drawTriangle(color, mMatrix);
    mMatrix = popMatrix(matrixStack);


}
////////////////////////////////////////////////////////////////////////
function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

    // stop the current loop of animation
    if (animation) {
    window.cancelAnimationFrame(animation);
    }
    var animate = function () {
    gl.clearColor(1, 1, 1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // initialize the model matrix to identity matrix
    mat4.identity(mMatrix);

    degree0 += 0.7;
    degree1 -= 2.4;

    if(translateDistance>=0.9) dir=-1;
    if(dir==1)
    translateDistance +=0.003;
    else translateDistance -=0.003;
    if(translateDistance<=-0.5) dir=1;
    
    // draw sky
    pushMatrix(matrixStack, mMatrix);
    color = [101/255, 204/255, 1, 1];
    mMatrix = mat4.translate(mMatrix, [0.0, 0.5, 0.0]);
    mMatrix = mat4.scale(mMatrix, [2, 1.0, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    //mountains
    drawMountains();

    // draw grass
    pushMatrix(matrixStack, mMatrix);
    color = [0, 229/255, 128/255, 1];
    mMatrix = mat4.translate(mMatrix, [0.0, -0.5, 0.0]);
    mMatrix = mat4.scale(mMatrix, [2, 1.0, 1.0]);
    drawSquare(color, mMatrix);
    mMatrix = popMatrix(matrixStack);

    drawRoad();

    //river
    
    drawRiver();

    //trees
    drawTrees();

    // boat
    drawBoat();

    //Windmill
    drawWindmill1();
    drawWindmill2();
    
    //grass
    drawGrass();
    //house
    drawHouse();
    
    //car
    drawCar();

    //clouds
    drawClouds();

    //sun
    drawSun();

    //birds
    drawBirds();

    animation = window.requestAnimationFrame(animate);
  };

  animate();
}

// This is the entry point from the html
function webGLStart() {
  var canvas = document.getElementById("simpleHTML");
  initGL(canvas);
  shaderProgram = initShaders();

  //get locations of attributes declared in the vertex shader
  const aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");

  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);

  uColorLoc = gl.getUniformLocation(shaderProgram, "color");

  initSquareBuffer();
  initTriangleBuffer();
  initCircleBuffer();

  drawScene();
}

function changeView(i){
    view = i;
    drawScene();
}
