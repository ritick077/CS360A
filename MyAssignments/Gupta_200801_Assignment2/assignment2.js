////////////////////////////////////////////////////////////////////////
//  A simple WebGL program to draw a 3D cube wirh basic interaction.
//
var gl;
var canvas;

var buf;
var indexBuf;

var aPositionLocation;
var aNormalLocation;
var uPMatrixLocation;
var uMMatrixLocation;
var uVMatrixLocation;
var uNMatrixLocation;

var uLightPosition;

var uShininessCoef;
var uLightAmbience;
var uLightDiffuse;
var uLightSpecular;

var ambience = [0, 0, 0, 1]; 
var specular = [1, 1, 1, 1]; 
var light_pos = [5, 5, 10, 1];   // eye space position 

var mat_shine = [50]; 

var cubeNormalBuf;
var spBuf;
var spIndexBuf;
var spNormalBuf;

var spVerts = [];
var spIndicies = [];
var spNormals = [];

var degree11 = 0.0;
var degree01 = 0.0;

var degree12 = 0.0;
var degree02= 0.0;

var degree13 = 0.0;
var degree03 = 0.0;

var prevMouseX = 0.0;
var prevMouseY = 0.0;
var matrixStack = [];


// initialize model, view, and projection matrices
var vMatrix = mat4.create(); // view matrix
var mMatrix = mat4.create(); // model matrix
var pMatrix = mat4.create(); //projection matrix
var nMatrix = mat4.create();

// specify camera/eye coordinate system parameters
var eyePos = [0.0, 0.0, 2.0];
var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];

// Vertex shader code
const perFaceVertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
uniform mat4 uNMatrix;

out vec3 posInEyeSpace;

void main() {
posInEyeSpace = vec3(uVMatrix*uMMatrix*vec4(aPosition, 1.0));
gl_Position = uPMatrix*uVMatrix*uMMatrix*vec4(aPosition,1.0);
gl_PointSize=10.0;
}`;

// Fragment shader code
const perFaceFragShaderCode = `#version 300 es
precision mediump float;
in vec3 posInEyeSpace; 
in vec3 v_normal;

uniform mat4 uMMatrix; 
uniform mat4 uPMatrix; 
uniform mat4 uMatrix; 
uniform mat4 uNMatrix;

uniform vec4 light_pos;
uniform float shininessVal;

uniform vec4 ambience; 
uniform vec4 light_diffuse; 
uniform vec4 specular;

out vec4 fragColor;

void main() {
vec3 light_pos_in_eye = vec3(light_pos);
vec3 v_normal = normalize(cross(dFdx(posInEyeSpace), dFdy (posInEyeSpace) )) ;
vec3 light_vector = normalize(vec3(light_pos_in_eye - posInEyeSpace)) ;

vec4 Iamb = ambience;
float ndotl = max(dot (v_normal, light_vector), 0.0);

vec4 Idiff = light_diffuse* ndotl;

vec3 R= normalize(vec3(-reflect(light_vector, v_normal))) ;
vec3 eye_vector = normalize(-vec3 (posInEyeSpace)) ;
float rdotv = max(dot (R, eye_vector), 0.0);

vec4 Ispec; 
if(ndotl>0.0)
Ispec = specular*pow(rdotv, shininessVal) ;
else
Ispec = vec4(0,0,0,1);

fragColor += Iamb+Idiff+Ispec;
}`;

const gouraudVertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
uniform mat4 uNMatrix;

in vec3 v_normal;
out vec3 posInEyeSpace;

uniform vec4 light_pos;
uniform float shininessVal;

uniform vec4 ambience; 
uniform vec4 light_diffuse; 
uniform vec4 specular;

out vec4 vertexColor;

void main() {
posInEyeSpace = vec3(uVMatrix*uMMatrix*vec4(aPosition, 1.0));

vec3 v_normal = normalize(vec3(uNMatrix*vec4(aNormal, 0.0)));

vec3 light_pos_in_eye = vec3(light_pos);

vec3 light_vector = normalize(vec3(light_pos_in_eye - posInEyeSpace)) ;
vec3 R= normalize(vec3(-reflect(light_vector, v_normal))) ;
vec3 eye_vector = normalize(-vec3 (posInEyeSpace)) ;

vec4 Iamb = ambience;
float ndotl = max(dot (v_normal, light_vector), 0.0);

vec4 Idiff = light_diffuse* ndotl;

float rdotv = max(dot (R, eye_vector), 0.0);

vec4 Ispec; 
if(ndotl>0.0)
Ispec = specular*pow(rdotv, shininessVal) ;
else
Ispec = vec4(0,0,0,1);

vertexColor += Iamb+Idiff+Ispec;

gl_Position = uPMatrix*uVMatrix*uMMatrix*vec4(aPosition,1.0);
gl_PointSize=10.0;
}`;

const gouraudFragShaderCode = `#version 300 es
precision mediump float;
in vec4 vertexColor;
out vec4 fragColor;

void main() {
  fragColor = vertexColor;
}`;

const phongVertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
uniform mat4 uNMatrix;

out vec3 posInEyeSpace;
out vec3 v_normal;

void main() {
posInEyeSpace = vec3(uVMatrix*uMMatrix*vec4(aPosition, 1.0));
v_normal = vec3(uNMatrix*vec4(aNormal,0.0));
gl_Position = uPMatrix*uVMatrix*uMMatrix*vec4(aPosition,1.0);
gl_PointSize=10.0;
}`;

// Fragment shader code
const phongFragShaderCode = `#version 300 es
precision mediump float;
in vec3 posInEyeSpace; 
in vec3 v_normal;
uniform mat4 uMMatrix; 
uniform mat4 uPMatrix; 
uniform mat4 uMatrix; 
uniform mat4 uNMatrix;

uniform vec4 light_pos;
uniform float shininessVal;

uniform vec4 ambience; 
uniform vec4 light_diffuse; 
uniform vec4 specular;

out vec4 fragColor;

void main() {
vec3 light_pos_in_eye = vec3(light_pos);

vec3 N = normalize(v_normal) ;
vec3 light_vector = normalize(vec3(light_pos_in_eye - posInEyeSpace)) ;

vec4 Iamb = ambience;
float ndotl = max(dot (v_normal, light_vector), 0.0);

vec4 Idiff = light_diffuse* ndotl;

vec3 R= normalize(vec3(-reflect(light_vector, v_normal))) ;
vec3 eye_vector = normalize(-vec3 (posInEyeSpace)) ;
float rdotv = max(dot (R, eye_vector), 0.0);

vec4 Ispec; 
if(ndotl>0.0)
Ispec = specular*pow(rdotv, shininessVal) ;
else
Ispec = vec4(0,0,0,1);

fragColor += Iamb+Idiff+Ispec;
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

function initShaders(vertexShaderCode,fragShaderCode) {
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

function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}


function initSphere(nslices, nstacks, radius) {
    var theta1, theta2;
  
    for (i = 0; i < nslices; i++) {
      spVerts.push(0);
      spVerts.push(-radius);
      spVerts.push(0);
  
      spNormals.push(0);
      spNormals.push(-1.0);
      spNormals.push(0);
    }
  
    for (j = 1; j < nstacks - 1; j++) {
      theta1 = (j * 2 * Math.PI) / nslices - Math.PI / 2;
      for (i = 0; i < nslices; i++) {
        theta2 = (i * 2 * Math.PI) / nslices;
        spVerts.push(radius * Math.cos(theta1) * Math.cos(theta2));
        spVerts.push(radius * Math.sin(theta1));
        spVerts.push(radius * Math.cos(theta1) * Math.sin(theta2));
  
        spNormals.push(Math.cos(theta1) * Math.cos(theta2));
        spNormals.push(Math.sin(theta1));
        spNormals.push(Math.cos(theta1) * Math.sin(theta2));
      }
    }
  
    for (i = 0; i < nslices; i++) {
      spVerts.push(0);
      spVerts.push(radius);
      spVerts.push(0);
  
      spNormals.push(0);
      spNormals.push(1.0);
      spNormals.push(0);
    }
  
    // setup the connectivity and indices
    for (j = 0; j < nstacks - 1; j++)
      for (i = 0; i <= nslices; i++) {
        var mi = i % nslices;
        var mi2 = (i + 1) % nslices;
        var idx = (j + 1) * nslices + mi;
        var idx2 = j * nslices + mi;
        var idx3 = j * nslices + mi2;
        var idx4 = (j + 1) * nslices + mi;
        var idx5 = j * nslices + mi2;
        var idx6 = (j + 1) * nslices + mi2;
  
        spIndicies.push(idx);
        spIndicies.push(idx2);
        spIndicies.push(idx3);
        spIndicies.push(idx4);
        spIndicies.push(idx5);
        spIndicies.push(idx6);
      }
  }
  
function initSphereBuffer() {
    var nslices = 30; // use even number
    var nstacks = nslices / 2 + 1;
    var radius = 0.5;
    initSphere(nslices, nstacks, radius);
  
    spBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spVerts), gl.STATIC_DRAW);
    spBuf.itemSize = 3;
    spBuf.numItems = nslices * nstacks;
  
    spNormalBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spNormals), gl.STATIC_DRAW);
    spNormalBuf.itemSize = 3;
    spNormalBuf.numItems = nslices * nstacks;
  
    spIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint32Array(spIndicies),
      gl.STATIC_DRAW
    );
    spIndexBuf.itemsize = 1;
    spIndexBuf.numItems = (nstacks - 1) * 6 * (nslices + 1);
  }

// Cube generation function with normals
function initCubeBuffer() {
    var vertices = [
      // Front face
      -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
      // Back face
      -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
      // Top face
      -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
      // Bottom face
      -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
      // Right face
      0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
      // Left face
      -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5,
    ];
    buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    buf.itemSize = 3;
    buf.numItems = vertices.length / 3;
  
    var normals = [
      // Front face
      0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
      // Back face
      0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,
      // Top face
      0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
      // Bottom face
      0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,
      // Right face
      1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
      // Left face
      -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
    ];
    cubeNormalBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    cubeNormalBuf.itemSize = 3;
    cubeNormalBuf.numItems = normals.length / 3;
  
  
    var indices = [
      0,
      1,
      2,
      0,
      2,
      3, // Front face
      4,
      5,
      6,
      4,
      6,
      7, // Back face
      8,
      9,
      10,
      8,
      10,
      11, // Top face
      12,
      13,
      14,
      12,
      14,
      15, // Bottom face
      16,
      17,
      18,
      16,
      18,
      19, // Right face
      20,
      21,
      22,
      20,
      22,
      23, // Left face
    ];
    indexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indices),
      gl.STATIC_DRAW
    );
    indexBuf.itemSize = 1;
    indexBuf.numItems = indices.length;
  }

function drawCube(color) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.vertexAttribPointer(
    aPositionLocation,
    buf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // draw elementary arrays - triangle indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
  gl.vertexAttribPointer(
    aNormalLocation,
    cubeNormalBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );
  
  gl.uniform4f(uLightPosition,light_pos[0], light_pos[1], light_pos[2], light_pos[3]); 	
	gl.uniform1f(uShininessCoef, mat_shine[0]); 

	gl.uniform4f(uLightAmbience, ambience[0], ambience[1], ambience[2], 1.0); 
	gl.uniform4fv(uLightDiffuse, color); 
	gl.uniform4f(uLightSpecular, specular[0], specular[1], specular[2],1.0);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
  gl.uniformMatrix4fv(uNMatrixLocation, false, nMatrix);

  gl.drawElements(gl.TRIANGLES, indexBuf.numItems, gl.UNSIGNED_SHORT, 0);
  //gl.drawArrays(gl.LINE_STRIP, 0, buf.numItems); // show lines
  //gl.drawArrays(gl.POINTS, 0, buf.numItems); // show points
}
function drawSphere(color) {
    gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
    gl.vertexAttribPointer(aPositionLocation, spBuf.itemSize, gl.FLOAT, false, 0, 0);
  
    // Bind the normal buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);

    var aNormal = gl.getAttribLocation(shaderProgram, "aNormal");
  
    gl.vertexAttribPointer(aNormal, spNormalBuf.itemSize, gl.FLOAT, false, 0, 0);
    
    gl.enableVertexAttribArray(aNormal);


    gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
    gl.vertexAttribPointer(
      aNormalLocation,
      spNormalBuf.itemSize,
      gl.FLOAT,
      false,
      0,
      0
    );

    // draw elementary arrays - triangle indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);

    gl.uniform4f(uLightPosition,light_pos[0], light_pos[1], light_pos[2], light_pos[3]); 	
    gl.uniform1f(uShininessCoef, mat_shine[0]); 

    gl.uniform4f(uLightAmbience, ambience[0], ambience[1], ambience[2], 1.0); 
    gl.uniform4fv(uLightDiffuse, color); 
    gl.uniform4f(uLightSpecular, specular[0], specular[1], specular[2],1.0);
    gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
    gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
    gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
    gl.uniformMatrix4fv(uNMatrixLocation, false, nMatrix);	

    gl.drawElements(gl.TRIANGLES, spIndexBuf.numItems, gl.UNSIGNED_INT, 0);
    // gl.drawArrays(gl.LINE_STRIP, 0, buf.numItems); // show lines
    //gl.drawArrays(gl.POINTS, 0, buf.numItems); // show points

  }
function figure1(){
    // initialize shader program
    shaderProgram = initShaders(perFaceVertexShaderCode,perFaceFragShaderCode);

    //get locations of attributes and uniforms declared in the shader
    aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
    aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");

    uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
    uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
    uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");

    uNMatrixLocation = gl.getUniformLocation(shaderProgram,"uNMatrix")

    uColorLocation = gl.getUniformLocation(shaderProgram, "objColor");

    uLightPosition = gl.getUniformLocation(shaderProgram,"light_pos");
    uShininessCoef = gl.getUniformLocation(shaderProgram,"shininessVal");

    uLightAmbience = gl.getUniformLocation(shaderProgram,"ambience");
    uLightDiffuse = gl.getUniformLocation(shaderProgram,"light_diffuse");
    uLightSpecular = gl.getUniformLocation(shaderProgram,"specular");

    //enable the attribute arrays
    gl.enableVertexAttribArray(aPositionLocation);
    gl.enableVertexAttribArray(aNormalLocation);

    //initialize buffers for the square
    initCubeBuffer();
    initSphereBuffer();

    // set up the view matrix, multiply into the modelview matrix
    mat4.identity(vMatrix);
    vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

    //set up perspective projection matrix
    mat4.identity(pMatrix);
    mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

    //set up the model matrix
    mat4.identity(mMatrix);

    // transformations applied here on model matrix
    mMatrix = mat4.rotate(mMatrix, degToRad(degree01), [0, 1, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(degree11), [1, 0, 0]);

    mat4.identity(nMatrix);
    nMatrix = mat4.multiply(nMatrix, vMatrix);
    nMatrix = mat4.multiply(nMatrix, mMatrix); 	
    nMatrix = mat4.inverse(nMatrix);
    nMatrix = mat4.transpose(nMatrix);

    // Now draw the cube
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.rotate(mMatrix, degToRad(1.5), [0.0, 0.0, 1.0]);
    var color = [177/255, 175/255, 117/255, 1]; // specify color for the cube
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.rotate(mMatrix, degToRad(25), [0.0, 1.0, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-10), [-1, 0, -0.25]);
    var translation = [0.0, -0.2, 0]; // Modify the translation values as needed
    mat4.translate(mMatrix, translation);

    var scale = [0.5, 0.8, 0.5]; // Modify the scaling factors as needed
    mat4.scale(mMatrix, scale);

    drawCube(color);
    mMatrix = matrixStack.pop();

    var color = [0, 143/255, 200/255, 1]; // specify color for the cube
    pushMatrix(matrixStack, mMatrix);
    var translation = [0.0, 0.49, 0.08]; // Modify the translation values as needed
    mat4.translate(mMatrix, translation);

    var scale = [0.6, 0.6, 0.6]; // Modify the scaling factors as needed
    mat4.scale(mMatrix, scale);

    drawSphere(color);
    mMatrix = matrixStack.pop();

    mMatrix = matrixStack.pop();

}
function figure2(){
        // initialize shader program
    shaderProgram = initShaders(gouraudVertexShaderCode,gouraudFragShaderCode);

    //get locations of attributes and uniforms declared in the shader
    aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
    aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");

    uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
    uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
    uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");

    uNMatrixLocation = gl.getUniformLocation(shaderProgram,"uNMatrix")

    uColorLocation = gl.getUniformLocation(shaderProgram, "objColor");

    uLightPosition = gl.getUniformLocation(shaderProgram,"light_pos");
    uShininessCoef = gl.getUniformLocation(shaderProgram,"shininessVal");

    uLightAmbience = gl.getUniformLocation(shaderProgram,"ambience");
    uLightDiffuse = gl.getUniformLocation(shaderProgram,"light_diffuse");
    uLightSpecular = gl.getUniformLocation(shaderProgram,"specular");

    //enable the attribute arrays
    gl.enableVertexAttribArray(aPositionLocation);
    gl.enableVertexAttribArray(aNormalLocation);

    //initialize buffers for the square
    initCubeBuffer();
    initSphereBuffer();

    // set up the view matrix, multiply into the modelview matrix
    mat4.identity(vMatrix);
    vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

    //set up perspective projection matrix
    mat4.identity(pMatrix);
    mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

    //set up the model matrix
    mat4.identity(mMatrix);

    // transformations applied here on model matrix
    mMatrix = mat4.rotate(mMatrix, degToRad(degree02), [0, 1, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(degree12), [1, 0, 0]);

    mat4.identity(nMatrix);
    nMatrix = mat4.multiply(nMatrix, vMatrix);
    nMatrix = mat4.multiply(nMatrix, mMatrix); 	
    nMatrix = mat4.inverse(nMatrix);
    nMatrix = mat4.transpose(nMatrix);

    pushMatrix(matrixStack, mMatrix);
    var translation = [0.0, -0.1, 0]; // Modify the translation values as needed
    mat4.translate(mMatrix, translation);
    var scale = [0.9, 0.9, 0.9]; // Modify the scaling factors as needed
    mat4.scale(mMatrix, scale);
    //
    var color = [223/255, 223/255, 223/255, 1]; // specify color for the cube
    pushMatrix(matrixStack, mMatrix);
    var translation = [0.0, -0.4, 0]; // Modify the translation values as needed
    mat4.translate(mMatrix, translation);

    var scale = [0.8, 0.8, 0.8]; // Modify the scaling factors as needed
    mat4.scale(mMatrix, scale);

    drawSphere(color);
    mMatrix = matrixStack.pop();

    //
    var color = [0, 175/255, 0, 1]; // specify color for the cube
    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.rotate(mMatrix, degToRad(-30), [0.0, 0.0, 1.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-15), [0.0, 1, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(-15), [-1, -1, -0.5]);
    var translation = [-0.45, -0.25, -0.05]; // Modify the translation values as needed
    
    mat4.translate(mMatrix, translation);

    var scale = [0.43, 0.43, 0.43]; // Modify the scaling factors as needed
    mat4.scale(mMatrix, scale);

    drawCube(color);
    mMatrix = matrixStack.pop();

    //
    var color = [223/255, 223/255, 223/255, 1]; // specify color for the cube
    pushMatrix(matrixStack, mMatrix);
    var translation = [-0.34, 0.36, -0.05]; // Modify the translation values as needed
    mat4.translate(mMatrix, translation);

    var scale = [0.45, 0.45, 0.45]; // Modify the scaling factors as needed
    mat4.scale(mMatrix, scale);

    drawSphere(color);
    mMatrix = matrixStack.pop();

    var color = [0, 175/255, 0, 1]; // specify color for the cube
    pushMatrix(matrixStack, mMatrix);
    
    mMatrix = mat4.rotate(mMatrix, degToRad(-5), [0.0, 1, 0.0]);
    
    var translation = [-0.06, 0.5, -0.25]; // Modify the translation values as needed
    mMatrix = mat4.rotate(mMatrix, degToRad(30), [1, 1, -0.5]);
    mat4.translate(mMatrix, translation);
    mMatrix = mat4.rotate(mMatrix, degToRad(-55), [0.0, 0.0, 1.0]);

    var scale = [0.32, 0.32, 0.32]; // Modify the scaling factors as needed
    mat4.scale(mMatrix, scale);

    drawCube(color);
    mMatrix = matrixStack.pop();

    //
    var color = [223/255, 223/255, 223/255, 1]; // specify color for the cube
    pushMatrix(matrixStack, mMatrix);
    var translation = [-0.12, 0.82, 0.08]; // Modify the translation values as needed
    mat4.translate(mMatrix, translation);

    var scale = [0.3, 0.3, 0.3]; // Modify the scaling factors as needed
    mat4.scale(mMatrix, scale);

    drawSphere(color);
    mMatrix = matrixStack.pop();

    mMatrix = matrixStack.pop();

}
function figure3(){
        // initialize shader program
    shaderProgram = initShaders(phongVertexShaderCode,phongFragShaderCode);

    //get locations of attributes and uniforms declared in the shader
    aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
    aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");

    uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
    uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
    uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");

    uNMatrixLocation = gl.getUniformLocation(shaderProgram,"uNMatrix")

    uColorLocation = gl.getUniformLocation(shaderProgram, "objColor");

    uLightPosition = gl.getUniformLocation(shaderProgram,"light_pos");
    uShininessCoef = gl.getUniformLocation(shaderProgram,"shininessVal");

    uLightAmbience = gl.getUniformLocation(shaderProgram,"ambience");
    uLightDiffuse = gl.getUniformLocation(shaderProgram,"light_diffuse");
    uLightSpecular = gl.getUniformLocation(shaderProgram,"specular");

    //enable the attribute arrays
    gl.enableVertexAttribArray(aPositionLocation);
    gl.enableVertexAttribArray(aNormalLocation);

    //initialize buffers for the square
    initCubeBuffer();
    initSphereBuffer();

    // set up the view matrix, multiply into the modelview matrix
    mat4.identity(vMatrix);
    vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

    //set up perspective projection matrix
    mat4.identity(pMatrix);
    mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);

    //set up the model matrix
    mat4.identity(mMatrix);

    // transformations applied here on model matrix
    mMatrix = mat4.rotate(mMatrix, degToRad(degree03), [0, 1, 0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(degree13), [1, 0, 0]);

    mat4.identity(nMatrix);
    nMatrix = mat4.multiply(nMatrix, vMatrix);
    nMatrix = mat4.multiply(nMatrix, mMatrix); 	
    nMatrix = mat4.inverse(nMatrix);
    nMatrix = mat4.transpose(nMatrix);

    pushMatrix(matrixStack, mMatrix);
    mMatrix = mat4.rotate(mMatrix, degToRad(30), [0.0, 1.0, 0.0]);
    mMatrix = mat4.rotate(mMatrix, degToRad(5), [1.0, 0.0, 0.0]);
    var scale = [0.95, 0.95, 0.95]; // Modify the scaling factors as needed
    mat4.scale(mMatrix, scale);

    //grey sphere
    pushMatrix(matrixStack, mMatrix);
    var translation = [0.0, 0.618, 0]; // Modify the translation values as needed
    mat4.translate(mMatrix, translation);

    var scale = [0.45, 0.45, 0.45]; // Modify the scaling factors as needed
    mat4.scale(mMatrix, scale);

    var sphereColor = [229/255, 221/255, 250/255, 1.0]; // specify color for the sphere
    drawSphere(sphereColor);

    mMatrix = matrixStack.pop();

    //green sphere
    pushMatrix(matrixStack, mMatrix);
    var translation = [0.0, -0.665, 0]; // Modify the translation values as needed
    mat4.translate(mMatrix, translation);

    var scale = [0.45, 0.45, 0.45]; // Modify the scaling factors as needed
    mat4.scale(mMatrix, scale);

    var sphereColor = [0.0, 225/255, 0.0, 1.0]; // specify color for the sphere
    drawSphere(sphereColor);

    mMatrix = matrixStack.pop();

    //red slab
    var color = [181/255, 44/255, 0, 1]; // specify color for the cube
    pushMatrix(matrixStack, mMatrix);
    
    // mMatrix = mat4.rotate(mMatrix, degToRad(-5), [0.0, 1, 0.0]);
    
    var translation = [0, 0.37, 0]; // Modify the translation values as needed
    // mMatrix = mat4.rotate(mMatrix, degToRad(30), [1, 1, -0.5]);
    mat4.translate(mMatrix, translation);
    
    var scale = [3.5*0.4, 0.14*0.35, 1.2*0.35]; // Modify the scaling factors as needed
    mat4.scale(mMatrix, scale);

    drawCube(color);
    mMatrix = matrixStack.pop();

    //yellow sphere
    pushMatrix(matrixStack, mMatrix);
    var translation = [0.5, 0.1725, 0]; // Modify the translation values as needed
    mat4.translate(mMatrix, translation);

    var scale = [0.35, 0.35, 0.35]; // Modify the scaling factors as needed
    mat4.scale(mMatrix, scale);

    var sphereColor = [222/255, 162/255, 49/255, 1.0]; // specify color for the sphere
    drawSphere(sphereColor);

    mMatrix = matrixStack.pop();

    //pink sphere
    pushMatrix(matrixStack, mMatrix);
    var translation = [-0.5, 0.1725, 0]; // Modify the translation values as needed
    mat4.translate(mMatrix, translation);

    var scale = [0.35, 0.35, 0.35]; // Modify the scaling factors as needed
    mat4.scale(mMatrix, scale);

    var sphereColor = [250/255, 0, 238/255, 1.0]; // specify color for the sphere
    drawSphere(sphereColor);

    mMatrix = matrixStack.pop();

    //red slab
    var color = [155/255, 156/255, 0, 1]; // specify color for the cube
    pushMatrix(matrixStack, mMatrix);
    
    var translation = [-0.5, -0.025, 0]; // Modify the translation values as needed
    mat4.translate(mMatrix, translation);
    mMatrix = mat4.rotate(mMatrix, degToRad(90), [0, 1, 0]);

    var scale = [2.5*0.4, 0.14*0.35, 1.2*0.35]; // Modify the scaling factors as needed
    mat4.scale(mMatrix, scale);

    drawCube(color);
    mMatrix = matrixStack.pop();

    //green slab
    var color = [0, 162/255, 127/255, 1]; // specify color for the cube
    pushMatrix(matrixStack, mMatrix);
    
    var translation = [0.5, -0.025, 0]; // Modify the translation values as needed
    mat4.translate(mMatrix, translation);
    mMatrix = mat4.rotate(mMatrix, degToRad(90), [0, 1, 0]);

    var scale = [2.5*0.4, 0.14*0.35, 1.2*0.35]; // Modify the scaling factors as needed
    mat4.scale(mMatrix, scale);

    drawCube(color);
    mMatrix = matrixStack.pop();

   
    //red slab
    var color = [181/255, 44/255, 0/255, 1]; // specify color for the cube
    pushMatrix(matrixStack, mMatrix);
    
    // mMatrix = mat4.rotate(mMatrix, degToRad(-5), [0.0, 1, 0.0]);
    
    var translation = [0, -0.418, 0]; // Modify the translation values as needed
    // mMatrix = mat4.rotate(mMatrix, degToRad(30), [1, 1, -0.5]);
    mat4.translate(mMatrix, translation);
    

    var scale = [3.5*0.4, 0.14*0.35, 1.2*0.35]; // Modify the scaling factors as needed
    mat4.scale(mMatrix, scale);

    drawCube(color);
    mMatrix = matrixStack.pop();

    //purple
    pushMatrix(matrixStack, mMatrix);
    var translation = [0.5, -0.22, 0]; // Modify the translation values as needed
    mat4.translate(mMatrix, translation);

    var scale = [0.35, 0.35, 0.35]; // Modify the scaling factors as needed
    mat4.scale(mMatrix, scale);

    var sphereColor = [0.0, 150/255, 173/255, 1.0]; // specify color for the sphere
    drawSphere(sphereColor);

    mMatrix = matrixStack.pop();

    //blue
    pushMatrix(matrixStack, mMatrix);
    var translation = [-0.5, -0.22, 0]; // Modify the translation values as needed
    mat4.translate(mMatrix, translation);

    var scale = [0.35, 0.35, 0.35]; // Modify the scaling factors as needed
    mat4.scale(mMatrix, scale);

    var sphereColor = [101/255, 100/255, 200/255, 1.0]; // specify color for the sphere
    drawSphere(sphereColor);

    mMatrix = matrixStack.pop();

    mMatrix = matrixStack.pop();


}
//////////////////////////////////////////////////////////////////////
//Main drawing routine
function drawScene() {

  // You need to enable scissor_test to be able to use multiple viewports
  gl.enable(gl.SCISSOR_TEST);

  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clearColor(0.9, 0.9, 0.95, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


  // Now define 3 different viewport areas for drawing

  ////////////////////////////////////////
  // Lower left viewport area
  gl.viewport(0, 0, 400, 400);
  gl.scissor(0, 0, 400, 400);
  gl.clearColor(217/255, 217/255, 243/255, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  figure1();

  ////////////////////////////////////////
  // Lower middle viewport area
  gl.viewport(400, 0, 400, 400);
  gl.scissor(400, 0, 400, 400);
  gl.clearColor(246/255, 216/255, 216/255, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  figure2();

  ////////////////////////////////////////
  // Lower right viewport area
  gl.viewport(800, 0, 400, 400);
  gl.scissor(800, 0, 400, 400);
  gl.clearColor(212/255, 243/255, 214/255, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  figure3();

  
}

function onMouseDown(event) {
  document.addEventListener("mousemove", onMouseMove, false);
  document.addEventListener("mouseup", onMouseUp, false);
  document.addEventListener("mouseout", onMouseOut, false);

  if (
    event.layerX <= canvas.width &&
    event.layerX >= 0 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    prevMouseX = event.clientX;
    prevMouseY = canvas.height - event.clientY;
  }
}

function onMouseMove(event) {
  // make mouse interaction only within canvas
  if (
    event.layerX <= canvas.width/3 &&
    event.layerX >= 0 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    var mouseX = event.clientX;
    var diffX1 = mouseX - prevMouseX;
    prevMouseX = mouseX;
    degree01 = degree01 + diffX1 / 5;

    var mouseY = canvas.height - event.clientY;
    var diffY2 = mouseY - prevMouseY;
    prevMouseY = mouseY;
    degree11 = degree11 - diffY2 / 5;

    drawScene();
  }
  else if (
    event.layerX <= 2*canvas.width/3 &&
    event.layerX >= canvas.width/3  &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    var mouseX = event.clientX;
    var diffX1 = mouseX - prevMouseX;
    prevMouseX = mouseX;
    degree02 = degree02 + diffX1 / 5;

    var mouseY = canvas.height - event.clientY;
    var diffY2 = mouseY - prevMouseY;
    prevMouseY = mouseY;
    degree12 = degree12 - diffY2 / 5;

    drawScene();
  }
  else if (
    event.layerX <= canvas.width &&
    event.layerX >= 2*canvas.width/3  &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    var mouseX = event.clientX;
    var diffX1 = mouseX - prevMouseX;
    prevMouseX = mouseX;
    degree03 = degree03 + diffX1 / 5;

    var mouseY = canvas.height - event.clientY;
    var diffY2 = mouseY - prevMouseY;
    prevMouseY = mouseY;
    degree13 = degree13 - diffY2 / 5;

    drawScene();
  }
}

function onMouseUp(event) {
  document.removeEventListener("mousemove", onMouseMove, false);
  document.removeEventListener("mouseup", onMouseUp, false);
  document.removeEventListener("mouseout", onMouseOut, false);
}

function onMouseOut(event) {
  document.removeEventListener("mousemove", onMouseMove, false);
  document.removeEventListener("mouseup", onMouseUp, false);
  document.removeEventListener("mouseout", onMouseOut, false);
}
function zoomChange(event) {
    eyePos[2]=event.target.value;
    drawScene();
}
function lightChange(event) {
    light_pos[0]=event.target.value;
    drawScene();
}
// This is the entry point from the html
function webGLStart() {
  canvas = document.getElementById("3Drender");
  document.addEventListener("mousedown", onMouseDown, false);
  document.getElementById("positionlight").addEventListener('input', lightChange, false);
  document.getElementById("zoomcamera").addEventListener('input', zoomChange, false);

  // initialize WebGL
  initGL(canvas);

  gl.enable(gl.DEPTH_TEST);
  drawScene();
}
