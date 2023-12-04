///////////////////////////////////////////////////////////
//  A simple WebGL program to show how to load JSON model

var gl;
var canvas;
var matrixStack = [];

var zAngle = 0.0;
var yAngle = 0.0;

var prevMouseX = 0;
var prevMouseY = 0;

var buf;
var indexBuf;
var cubeNormalBuf;
var cubeTexBuf;
var animation;
var resetFlag;

var spVerts = [];
var spIndicies = [];
var spNormals = [];
var spTexCoords = [];
var spBuf;
var spIndexBuf;
var spNormalBuf;
var spTexBuf;

var squareVertices = [];
var squareIndices = [];
var squareNormals = [];
var squareTexCoords = [];
var squareVertexPosBuf;
var squareVertexIndexBuf;
var squareVertexNormalBuf;
var squareVerTextureCoordsBuf;

var objVerPosBuffer;
var objVertexIndexBuff;
var objVertNormalBuff;
var objVertTexCoordBuff;
var uDiffuseTermLocation;

var uLightPosition;
var uAmbientCoeff;
var uDiffusionCoeff;
var uSpecularCoeff;
var uShineCoeff;
var uLightAmbience;
var uLightDiffuse;
var uLightSpecular;

var uMMatrixLocation;
var uVMatrixLocation;
var uPMatrixLocation;
var uWNMatrixLocation;
var uNMatrixLocation;

var aPositionLocation;
var aNormalLocation;
var aTexCoordLocation;
var uTextureLocation;
var uTextureLocationFg;
var uCubeTextureLocation;
var uRegTexLocation;
var uTypeLocation;
var flagLocation;
var brightLocation;
var contrastLocation;
 
// set up the parameters for lighting 
var ambience = [0.9, 0.9, 0.9, 1]; 
var specular = [0.9, 0.9, 0.9, 1]; 
var light_pos = [0.0, 1.5, 0, 1];   // eye space position 

var type = [0.0];
var flagVal = [1.0]
var brightVal = [0.0];
var contrastVal = [0.0];

var mat_ambient = [0.1, 0.1, 0.1, 1]; 
var mat_diffuse= [0.9, 0.9, 0.9, 1]; 
var mat_specular = [0.9, 0.9, 0.9, 1]; 
var mat_shine = [50];

var cubeMapTexture;

var vMatrix = mat4.create(); // view matrix
var mMatrix = mat4.create(); // model matrix
var pMatrix = mat4.create(); // projection matrix
var wnMatrix = mat4.create(); // matrix
var nMatrix = mat4.create();  //normal matrix

var eyePos = [0, 0, 5.0];
var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];

// Input JSON model file to load
input_JSON = "teapot.json";

var alphaFBO;
var cubeMapPath = "Images/";
var fgPic, bgPic;
var alphaTexture;

var fgPic_file = cubeMapPath.concat("woods_alpha.png");
var bgPic_file = cubeMapPath.concat("nature_2.jpg");

const vertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexCoords;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
uniform mat4 uNMatrix; 
uniform mat4 uWNMatrix;
uniform float uType;
uniform float flag;
uniform float bright; 
uniform float contrast;

out vec2 fragTexCoord;
out vec3 v_worldPosition;
out vec3 v_worldNormal;
out vec3 posInEyeSpace;
out vec3 normal;

void main() {

  fragTexCoord = aTexCoords;
  v_worldPosition = mat3(uMMatrix)*aPosition;
  v_worldNormal = mat3(uWNMatrix)*aNormal;
  normal = normalize(vec3(uNMatrix * vec4(aNormal, 0.0)));
  posInEyeSpace = vec3(uVMatrix * uMMatrix * vec4(aPosition, 1.0));
  gl_Position = uMMatrix * vec4(aPosition, 1.0);
  gl_PointSize = 10.0;

}`;

const fragShaderCode = `#version 300 es
precision mediump float;

in vec3 aPosition;
in vec3 aNormal;
in vec3 posInEyeSpace;
in vec3 normal;

in vec3 v_worldPosition;
in vec3 v_worldNormal;
in vec2 fragTexCoord;

uniform vec3 eyePosWorld;

uniform vec4 lightPos; 
uniform vec4 ambienceCoeff;
uniform vec4 diffuseCoeff;
uniform vec4 specularCoeff;
uniform float matShininess; 
uniform float uType; 
uniform float flag;
uniform float bright;
uniform float contrast; 

uniform vec4 ambience; 
uniform vec4 light_diffuse; 
uniform vec4 specular;

uniform mat4 uMMatrix;
uniform mat4 uVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uNMatrix;
uniform mat4 uWNMatrix; 

uniform vec4 diffuseTerm;
uniform samplerCube imageCubeTexture;
uniform sampler2D imageTexture;
uniform sampler2D imageTextureFg;

out vec4 fragColor;

const mat3 smoothKernel = mat3(
  1.0/9.0, 1.0/9.0, 1.0/9.0,
  1.0/9.0, 1.0/9.0, 1.0/9.0,
  1.0/9.0, 1.0/9.0, 1.0/9.0);

const mat3 sharpKernel = mat3(
  0.0, -1.0, 0.0,
  -1.0, 5.0, -1.0,
  0.0, -1.0, 0.0);

const mat3 embossKernel = mat3(
  -3.0/5.0, -1.0/5.0, 0.0,
  -1.0/5.0, 5.0/5.0, 1.0/5.0,
  0.0, 1.0/5.0, 3.0/5.0);

const mat3 laplaceKernel = mat3(
  0.0, -1.0, 0.0,
  -1.0, 4.0, -1.0,
  0.0, -1.0, 0.0);

void main() {

    vec3 worldNormal = normalize(v_worldNormal);
    vec3 eyeToSurfaceDir = normalize(v_worldPosition-eyePosWorld);
    vec3 directionReflection = reflect(eyeToSurfaceDir, worldNormal);
    vec4 cubeMapReflectCol = texture(imageCubeTexture, directionReflection);
  
    vec3 lightPosInEyeSpace = vec3(lightPos);
    vec3 lightVector = normalize(vec3(lightPosInEyeSpace - posInEyeSpace)); 
    vec3 reflectionVector = normalize(vec3(reflect(-lightVector, normal))); 
    vec3 viewVector = normalize(-vec3(posInEyeSpace));
  
    vec4 ambient = ambienceCoeff * ambience; 
  
    float ndotl = max(dot(normal, lightVector), 0.0); 
    vec4 diffuse = diffuseCoeff * light_diffuse * ndotl;
    float sR, sG, sB;
  
    float rdotv = max(dot(reflectionVector, viewVector), 0.0);
    vec4 specular;  
    if (ndotl > 0.0) 
    {
      specular = specularCoeff * specular * pow(rdotv, matShininess);
    } 
    else
    {
      specular = vec4(0, 0, 0, 1); 
    }

  vec4 textureColor =  texture(imageTexture, fragTexCoord); 
  vec4 textureColorFg =  texture(imageTextureFg, fragTexCoord); 
  
  if(flag == 1.0){
    //alpha blending

    float alpha = textureColorFg.a;
    vec4 alphaBlend = alpha*textureColorFg + (1.0-alpha)*textureColor;

    textureColor = alphaBlend;
  }

  if(uType == 0.0){
    //normal
    fragColor = vec4(0,0,0,1);
    fragColor = textureColor;
  }

  else if(uType == 1.0){

    //black and white
    fragColor = vec4(0,0,0,1);

    textureColor.r*=0.2126;
    textureColor.g*=0.7152;
    textureColor.b*=0.0722;

    sR = textureColor.r+textureColor.g+textureColor.b;

    textureColor.r= sR;
    textureColor.g= sR;
    textureColor.b= sR;

    fragColor = textureColor;
  }

  else if(uType == 2.0){

    //sepia
    fragColor = vec4(0,0,0,1);

    sR = 0.393*textureColor.r + 0.769*textureColor.g + 0.189*textureColor.b;
    sG = 0.349*textureColor.r + 0.686*textureColor.g + 0.168*textureColor.b;
    sB = 0.272*textureColor.r + 0.534*textureColor.g + 0.131*textureColor.b;

    textureColor.r= sR;
    textureColor.g= sG;
    textureColor.b= sB;

    fragColor = textureColor;
  }

  else if(uType == 3.0){

    //brightness
    fragColor = vec4(0,0,0,1);

    textureColor.r+=bright;
    textureColor.g+=bright;
    textureColor.b+=bright;

    fragColor = textureColor;
  }

  else if(uType == 4.0){

    //contrast
    fragColor = vec4(0,0,0,1);
    textureColor = vec4((textureColor.r-0.5)*(1.0+contrast)+0.5,
                        (textureColor.g-0.5)*(1.0+contrast)+0.5,
                        (textureColor.b-0.5)*(1.0+contrast)+0.5,
                        1.0);
    fragColor = textureColor;
  }

  else if(uType == 5.0){


    //smooth
    fragColor = vec4(0,0,0,1);
    
    vec2 onePixel = vec2(float(1), float(1)) / vec2(400.0,400.0);
    vec4 colorSum = vec4(0,0,0,1);

    for(int i=-1; i<=1; i++){
      for(int j = -1; j<=1; j++){
          colorSum+= (texture(imageTexture, fragTexCoord + vec2(float(i), float(j))*onePixel)*smoothKernel[i+1][j+1]);
      }
    }
    fragColor=colorSum;
  }

  else if(uType == 6.0){

    //sharp
    fragColor = vec4(0,0,0,1);
    
    vec2 onePixel = vec2(float(1), float(1)) / vec2(400.0,400.0);
    vec4 colorSum = vec4(0,0,0,1);

    for(int i=-1; i<=1; i++){
      for(int j = -1; j<=1; j++){
          colorSum+= (texture(imageTexture, fragTexCoord + vec2(float(i), float(j))*onePixel)*sharpKernel[i+1][j+1]);
      }
    }
    fragColor=colorSum;
  }
  else if(uType == 7.0){

    //gradient
    fragColor = vec4(0,0,0,1);
    vec4 center = texture(imageTexture, fragTexCoord);

    vec4 top = texture(imageTexture, fragTexCoord + vec2(0.0, 1.0/400.0));
    vec4 bottom = texture(imageTexture, fragTexCoord + vec2(0.0, -1.0/400.0));
    vec4 left = texture(imageTexture, fragTexCoord + vec2(-1.0/400.0, 0.0));
    vec4 right = texture(imageTexture, fragTexCoord + vec2(1.0/400.0, 0.0));

    vec4 dx = (right-left)*0.5;
    vec4 dy = (top-bottom)*0.5;

    vec4 gradMag = sqrt(dx*dx + dy*dy);

    fragColor += gradMag;
  }
  else if(uType == 8.0){

    //laplace
    fragColor = vec4(0,0,0,1);
    
    vec2 onePixel = vec2(float(1), float(1)) / vec2(400.0,400.0);
    vec4 colorSum = vec4(0,0,0,1);

    for(int i=-1; i<=1; i++){
      for(int j = -1; j<=1; j++){
          colorSum+= (texture(imageTexture, fragTexCoord + vec2(float(i), float(j))*onePixel)*laplaceKernel[i+1][j+1]);
      }
    }
    fragColor=colorSum;
  }
  
  
}`;

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

function initShaders(vertexShaderCode, fragShaderCode) {
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
    gl = canvas.getContext("webgl2", {preserveDrawingBuffer: true}); // the graphics webgl2 context
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

function pushMatrix(stack, m) {
  //necessary because javascript only does shallow push
  var copy = mat4.create(m);
  stack.push(copy);
}

function popMatrix(stack) {
  if (stack.length > 0) return stack.pop();
  else console.log("stack has no matrix to pop!");
}

// New sphere initialization function
function initSphere(nslices, nstacks, radius) {
  for (var i = 0; i <= nslices; i++) {
    var angle = (i * Math.PI) / nslices;
    var comp1 = Math.sin(angle);
    var comp2 = Math.cos(angle);

    for (var j = 0; j <= nstacks; j++) {
      var phi = (j * 2 * Math.PI) / nstacks;
      var comp3 = Math.sin(phi);
      var comp4 = Math.cos(phi);

      var xcood = comp4 * comp1;
      var ycoord = comp2;
      var zcoord = comp3 * comp1;
      var utex = 1 - j / nstacks;
      var vtex = 1 - i / nslices;

      spVerts.push(radius * xcood, radius * ycoord, radius * zcoord);
      spNormals.push(xcood, ycoord, zcoord);
      spTexCoords.push(utex, vtex);
    }
  }

  for (var i = 0; i < nslices; i++) {
    for (var j = 0; j < nstacks; j++) {
      var id1 = i * (nstacks + 1) + j;
      var id2 = id1 + nstacks + 1;

      spIndicies.push(id1, id2, id1 + 1);
      spIndicies.push(id2, id2 + 1, id1 + 1);
    }
  }
}

function initSphereBuffer() {
  var nslices = 50;
  var nstacks = 50;
  var radius = 1.0;

  initSphere(nslices, nstacks, radius);

  // buffer for vertices
  spBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spVerts), gl.STATIC_DRAW);
  spBuf.itemSize = 3;
  spBuf.numItems = spVerts.length / 3;

  // buffer for indices
  spIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint32Array(spIndicies),
    gl.STATIC_DRAW
  );
  spIndexBuf.itemsize = 1;
  spIndexBuf.numItems = spIndicies.length;

  // buffer for normals
  spNormalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spNormals), gl.STATIC_DRAW);
  spNormalBuf.itemSize = 3;
  spNormalBuf.numItems = spNormals.length / 3;

  // buffer for texture coordinates
  spTexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spTexBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spTexCoords), gl.STATIC_DRAW);
  spTexBuf.itemSize = 2;
  spTexBuf.numItems = spTexCoords.length / 2;
}

function drawSphere(color, type) {
  gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    spBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
  gl.vertexAttribPointer(
    aNormalLocation,
    spNormalBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, spTexBuf);
  gl.vertexAttribPointer(
    aTexCoordLocation,
    spTexBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // Draw elementary arrays - triangle indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);

	gl.uniform4f(uLightPosition, light_pos[0], light_pos[1], light_pos[2], light_pos[3]); 	
	gl.uniform4f(uAmbientCoeff, mat_ambient[0], mat_ambient[1], mat_ambient[2], 1.0); 
	gl.uniform4f(uDiffusionCoeff, mat_diffuse[0], mat_diffuse[1], mat_diffuse[2], 1.0); 
	gl.uniform4f(uSpecularCoeff, mat_specular[0], mat_specular[1], mat_specular[2], 1.0); 
	gl.uniform1f(uShineCoeff, mat_shine[0]); 
	gl.uniform1f(uTypeLocation, type[0]);
	gl.uniform4fv(uLightAmbience, color); 
	gl.uniform4fv(uLightDiffuse, color); 
  gl.uniform3fv(uEyePosLocation, eyePos);
	gl.uniform4f(uLightSpecular, specular[0], specular[1], specular[2], 1.0);
  gl.uniform4fv(uDiffuseTermLocation, color);

  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
  gl.uniformMatrix4fv(uWNMatrixLocation, false, wnMatrix);
  gl.uniformMatrix4fv(uNMatrixLocation, false, nMatrix);

  gl.drawElements(gl.TRIANGLES, spIndexBuf.numItems, gl.UNSIGNED_INT, 0);
}


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

  var texCoords = [
    // Front face
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    // Back face
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    // Top face
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    // Bottom face
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    // Right face
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
    // Left face
    0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
  ];
  cubeTexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTexBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
  cubeTexBuf.itemSize = 2;
  cubeTexBuf.numItems = texCoords.length / 2;

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

function drawCube(color, type){
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.vertexAttribPointer(
    aPositionLocation,
    buf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
  gl.vertexAttribPointer(
    aNormalLocation,
    cubeNormalBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTexBuf);
  gl.vertexAttribPointer(
    aTexCoordLocation,
    cubeTexBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);

  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
  gl.uniformMatrix4fv(uWNMatrixLocation, false, wnMatrix);
  gl.uniformMatrix4fv(uNMatrixLocation, false, nMatrix);

	gl.uniform4f(uLightPosition, light_pos[0], light_pos[1], light_pos[2], light_pos[3]); 	
	gl.uniform4f(uAmbientCoeff, mat_ambient[0], mat_ambient[1], mat_ambient[2], 1.0); 
	gl.uniform4f(uDiffusionCoeff, mat_diffuse[0], mat_diffuse[1], mat_diffuse[2], 1.0); 
	gl.uniform4f(uSpecularCoeff, mat_specular[0], mat_specular[1], mat_specular[2], 1.0); 
	gl.uniform1f(uShineCoeff, mat_shine[0]);
	gl.uniform1f(uTypeLocation, type[0]);
  gl.uniform1f(brightLocation, brightVal[0]);
  gl.uniform1f(contrastLocation, contrastVal[0]);
	gl.uniform4fv(uLightAmbience, color); 
	gl.uniform4fv(uLightDiffuse, color); 
  gl.uniform3fv(uEyePosLocation, eyePos);
	gl.uniform4f(uLightSpecular, specular[0], specular[1], specular[2], 1.0);
  gl.uniform4fv(uDiffuseTermLocation, color);

  gl.drawElements(gl.TRIANGLES, indexBuf.numItems, gl.UNSIGNED_SHORT, 0);
}

function initTextures(textureFile) {
  var tex = gl.createTexture();
  tex.image = new Image();
  tex.image.src = textureFile;
  tex.image.onload = function () {
    handleTextureLoaded(tex);
  };
  return tex;
}

function handleTextureLoaded(texture) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0); // use it to flip Y if needed
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    texture.image
  );

  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR
  );

  drawScene();
}

function initObject() {
  // XMLHttpRequest objects are used to interact with servers
  // It can be used to retrieve any type of data, not just XML.
  var request = new XMLHttpRequest();
  request.open("GET", input_JSON);
  // MIME: Multipurpose Internet Mail Extensions
  // It lets users exchange different kinds of data files
  request.overrideMimeType("application/json");
  request.onreadystatechange = function () {
    //request.readyState == 4 means operation is done
    if (request.readyState == 4) {
      processObject(JSON.parse(request.responseText));
    }
  };
  request.send();
}

function processObject(objData) {
  objVerPosBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, objVerPosBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(objData.vertexPositions),
    gl.STATIC_DRAW
  );
  objVerPosBuffer.itemSize = 3;
  objVerPosBuffer.numItems = objData.vertexPositions.length / 3;

  objVertNormalBuff =  gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,  objVertNormalBuff);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(objData.vertexNormals),
    gl.STATIC_DRAW
  );
  objVertNormalBuff.itemSize = 3;
  objVertNormalBuff.numItems = objData.vertexNormals.length/3;

  objVertTexCoordBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, objVertTexCoordBuff);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(objData.vertexTextureCoords),
    gl.STATIC_DRAW
  );
  objVertTexCoordBuff.itemSize = 2;
  objVertTexCoordBuff.numItems = objData.vertexTextureCoords.length/2;

  objVertexIndexBuff = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objVertexIndexBuff);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint32Array(objData.indices),
    gl.STATIC_DRAW
  );
  objVertexIndexBuff.itemSize = 1;
  objVertexIndexBuff.numItems = objData.indices.length;

  drawScene();
}

function drawObject(color, type) {
  gl.bindBuffer(gl.ARRAY_BUFFER, objVerPosBuffer);
  gl.vertexAttribPointer(
    aPositionLocation,
    objVerPosBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, objVertNormalBuff);
  gl.vertexAttribPointer(
    aNormalLocation,
    objVertNormalBuff.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, objVertTexCoordBuff);
	gl.vertexAttribPointer(
    aTexCoordLocation,
    objVertTexCoordBuff.itemSize,
    gl.Float32Array,
    false,
    0,
    0
  );
  
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objVertexIndexBuff);

  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
  gl.uniformMatrix4fv(uWNMatrixLocation, false, wnMatrix);
  gl.uniformMatrix4fv(uNMatrixLocation, false, nMatrix);

	gl.uniform4f(uLightPosition, light_pos[0], light_pos[1], light_pos[2], light_pos[3]); 	
	gl.uniform4f(uAmbientCoeff, mat_ambient[0], mat_ambient[1], mat_ambient[2], 1.0); 
	gl.uniform4f(uDiffusionCoeff, mat_diffuse[0], mat_diffuse[1], mat_diffuse[2], 1.0); 
	gl.uniform4f(uSpecularCoeff, mat_specular[0], mat_specular[1], mat_specular[2], 1.0); 
	gl.uniform1f(uShineCoeff, mat_shine[0]); 
	gl.uniform1f(uTypeLocation, type[0]);
	gl.uniform4fv(uLightAmbience, color); 
	gl.uniform4fv(uLightDiffuse, color); 
  gl.uniform3fv(uEyePosLocation, eyePos);
	gl.uniform4f(uLightSpecular, specular[0], specular[1], specular[2], 1.0);
  gl.uniform4fv(uDiffuseTermLocation, color);
  

  gl.drawElements(
    gl.TRIANGLES,
    objVertexIndexBuff.numItems,
    gl.UNSIGNED_INT,
    0
  );
}

function initCubeMap(){
  const faceInfos = [
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      url: posx_file,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      url: negx_file,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      url: posy_file,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      url: negy_file,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      url: posz_file,
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      url: negz_file,
    },
  ];
  cubeMapTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture);
  faceInfos.forEach((faceInfo) => {
    const { target, url } = faceInfo;
    // setup each face
    gl.texImage2D(
      target,
      0,
      gl.RGBA,
      512,
      512,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    // load images
    const image = new Image();
    image.src = url;
    image.addEventListener("load", function(){
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMapTexture);
      gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
      drawScene();
    });
  });
  // uses mipmap for texturing
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.texParameteri(
    gl.TEXTURE_CUBE_MAP,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR
  );
}

function initSquareBuffer(){
  
  // buffer for point locations
  squareVertices = [
    0.5,  0.5,  0,
    -0.5,  0.5,  0, 
    - 0.5, -0.5, 0,
    0.5, -0.5,  0,
    ];
  
  squareVertexPosBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPosBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(squareVertices), gl.STATIC_DRAW);
  squareVertexPosBuf.itemSize = 3;
  squareVertexPosBuf.numItems = 4;

  // buffer for point indices
  squareIndices = [0,1,2, 0,2,3];  

  squareVertexIndexBuf = gl.createBuffer();	
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, squareVertexIndexBuf); 
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(squareIndices), gl.STATIC_DRAW);  
  squareVertexIndexBuf.itemsize = 1;
  squareVertexIndexBuf.numItems = 6;  

  // buffer for normals
  squareNormals = [
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
    ];

  squareVertexNormalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexNormalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(squareNormals), gl.STATIC_DRAW);
  squareVertexNormalBuf.itemSize = 3;
  squareVertexNormalBuf.numItems = 4; 

  // buffer for texture
  squareTexCoords = [0.0,0.0,1.0,0.0,1.0,1.0,0.0,1.0]; 

  squareVerTextureCoordsBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerTextureCoordsBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(squareTexCoords), gl.STATIC_DRAW);
  squareVerTextureCoordsBuf.itemSize = 2;
  squareVerTextureCoordsBuf.numItems = 4; 

}

function drawSquare(color, flag, type, brightVal, contrastVal){
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPosBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    squareVertexPosBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexNormalBuf);
  gl.vertexAttribPointer(
    aNormalLocation,
    squareVertexNormalBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, squareVerTextureCoordsBuf);
  gl.vertexAttribPointer(
    aTexCoordLocation,
    squareVerTextureCoordsBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // Draw elementary arrays - triangle indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, squareVertexIndexBuf);

  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
  gl.uniformMatrix4fv(uWNMatrixLocation, false, wnMatrix);

	gl.uniform1f(uTypeLocation, type[0]);
  gl.uniform1f(flagLocation, flag[0]);
  gl.uniform1f(brightLocation, brightVal[0]);
  gl.uniform1f(contrastLocation, contrastVal[0]);
  gl.uniform4fv(uDiffuseTermLocation, color);
  gl.uniform3fv(uEyePosLocation, eyePos);

  gl.drawElements(gl.TRIANGLES, squareVertexIndexBuf.numItems, gl.UNSIGNED_SHORT, 0);
}

function drawSkyBox(){

  gl.bindFramebuffer(gl.FRAMEBUFFER, alphaFBO);
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clearColor(0.9, 0.9, 0.9, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  // back side
  pushMatrix(matrixStack, mMatrix);
  // texture setup for use
  gl.activeTexture(gl.TEXTURE1); // set texture unit 1 to use
  gl.bindTexture(gl.TEXTURE_2D, fgPic); // bind the texture object
  gl.uniform1i(uTextureLocationFg, 1); 
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, bgPic);
  gl.uniform1i(uTextureLocation, 2); // pass the texture unit
  // transformations
  mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 0, 1]);
  mMatrix = mat4.scale(mMatrix, [2,2,1]);
  color = [0.0,1.0,1.0,1.0];
  drawSquare(color, [1.0], [0.0], [0.3], [0.3]);
  mMatrix = popMatrix(matrixStack);



  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clearColor(0.9, 0.9, 0.9, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  // back side
  pushMatrix(matrixStack, mMatrix);
  // texture setup for use

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, alphaTexture);
  gl.uniform1i(uTextureLocation, 1); // pass the texture unit


  if(flagVal==0.0){
  gl.activeTexture(gl.TEXTURE2); // set texture unit 1 to use
  gl.bindTexture(gl.TEXTURE_2D, bgPic); // bind the texture object
  gl.uniform1i(uTextureLocation, 2); 
  mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 1, 0]);

  }

  if(flagVal==1.0){
    gl.activeTexture(gl.TEXTURE2); // set texture unit 1 to use
    gl.bindTexture(gl.TEXTURE_2D, bgPic); // bind the texture object
    gl.uniform1i(uTextureLocationFg, 2); 
    }
  
  // transformations
  mMatrix = mat4.scale(mMatrix, [2,2,1]);
  color = [0.0,1.0,1.0,1.0];
  drawSquare(color, [0.0], type, contrastVal, brightVal);
  mMatrix = popMatrix(matrixStack);

}

function initFBO(){
  // create a 2D texture in which framebuffer rendering will be stored
  alphaTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, alphaTexture);
  gl.texImage2D(
    gl.TEXTURE_2D, // target
    0, // mipmap level
    gl.RGBA, // internal format
    gl.viewportWidth, // width
    gl.viewportHeight, // height
    0, // border
    gl.RGBA, // format
    gl.UNSIGNED_BYTE, // type
    null // data, currently empty
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // create an FBO
  var frameBuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

  // attach texture FBOtexture to the framebuffer FBO
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, alphaTexture, 0);

  // check FBO status
  var FBOstatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if(FBOstatus != gl.FRAMEBUFFER_COMPLETE)
    console.error("GL_FRAMEBUFFER_COMPLETE failed, CANNOT use FBO");

  gl.bindTexture(gl.TEXTURE_2D, null);
  return frameBuffer;
}

function selectImageMode(){
  const radios = document.getElementsByName("imageType");
  for (const radio of radios) {
    if (radio.checked) {
      selectedImageType = radio.value;
      if (selectedImageType === "background") {
       
        flagVal = [0.0];
        resetFlag=flagVal;
         drawScene();
      } else if (selectedImageType === "alphablended") {
        
        flagVal = [1.0];
        resetFlag=flagVal;
        drawScene();
      }
    }
  }
}

function selectProcessMode(){
  const radios = document.getElementsByName("processType");
  for (const radio of radios) {
    if (radio.checked) {
      selectedImageType = radio.value;
      if (selectedImageType === "smooth") {
       
        type = [5.0];
         drawScene();
      } else if (selectedImageType === "sharpen") {
        
        type = [6.0];
        drawScene();
      }
      else if (selectedImageType === "gradient") {
        
        type = [7.0];
        drawScene();
      }
      else if (selectedImageType === "laplace") {
        
        type = [8.0];
        drawScene();
      }
    }
  }
}

function selectcolorMode(){
  const radios = document.getElementsByName("modeType");
  for (const radio of radios) {
    if (radio.checked) {
      selectedImageType = radio.value;
      if (selectedImageType === "gray") {
       
        type = [1.0];
         drawScene();
      } else if (selectedImageType === "sepia") {
        
        type = [2.0];
        drawScene();
      }
    }
  }
}

function resetCanvas(){
  flagVal=resetFlag;
  type=[0.0];
  drawScene();
}

function contrastChange(event) {
  type=[3.0];
  contrastVal[0]=event.target.value;
  drawScene();
}

function brightnessChange(event) {
  type=[4.0];
  brightVal[0]=event.target.value;
  drawScene();
}

//////////////////////////////////////////////////////////////////////
//The main drawing routine

function drawScene() {

  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clearColor(0.9, 0.9, 0.9, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  // zAngle-=0.01

  shaderProgram = initShaders(vertexShaderCode, fragShaderCode);

  //set up the model matrix
  mat4.identity(mMatrix);

  // set up the view matrix, multiply into the modelview matrix
  mat4.identity(vMatrix);
  // eyePos[0] = 5*Math.sin(zAngle);
  // eyePos[2] = 5*Math.cos(zAngle);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);

  //set up projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(60, 1.0, 0.01, 1000, pMatrix);

  mat4.identity(wnMatrix);
  wnMatrix = mat4.transpose(mat4.inverse(mMatrix));

  //set up the normal matrix
	mat4.identity(nMatrix); 
	nMatrix = mat4.multiply(nMatrix, vMatrix);
	nMatrix = mat4.multiply(nMatrix, mMatrix); 	
	nMatrix = mat4.inverse(nMatrix);
	nMatrix = mat4.transpose(nMatrix);

  //get locations of attributes declared in the vertex shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
  aTexCoordLocation = gl.getAttribLocation(shaderProgram, "aTexCoords");
  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
  uWNMatrixLocation = gl.getUniformLocation(shaderProgram, "uWNMatrix");
  uNMatrixLocation = gl.getUniformLocation(shaderProgram, "uNMatrix");
  uLightPosition = gl.getUniformLocation(shaderProgram, "lightPos");
  uAmbientCoeff = gl.getUniformLocation(shaderProgram, "ambienceCoeff");	
  uDiffusionCoeff = gl.getUniformLocation(shaderProgram, "diffuseCoeff");
  uSpecularCoeff = gl.getUniformLocation(shaderProgram, "specularCoeff");
  uShineCoeff = gl.getUniformLocation(shaderProgram, "matShininess");
  uTypeLocation = gl.getUniformLocation(shaderProgram, "uType");
  flagLocation = gl.getUniformLocation(shaderProgram, "flag");
  brightLocation = gl.getUniformLocation(shaderProgram, "bright");
  contrastLocation = gl.getUniformLocation(shaderProgram, "contrast");
  uEyePosLocation = gl.getUniformLocation(shaderProgram, "eyePosWorld");
  uLightAmbience = gl.getUniformLocation(shaderProgram, "ambience");	
  uLightDiffuse = gl.getUniformLocation(shaderProgram, "light_diffuse");
  uLightSpecular = gl.getUniformLocation(shaderProgram, "specular");

  uTextureLocation = gl.getUniformLocation(shaderProgram, "imageTexture");
  uTextureLocationFg = gl.getUniformLocation(shaderProgram, "imageTextureFg");
  uCubeTextureLocation = gl.getUniformLocation(shaderProgram, "imageCubeTexture");
  uDiffuseTermLocation = gl.getUniformLocation(shaderProgram, "diffuseTerm");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);
  gl.enableVertexAttribArray(aTexCoordLocation);
  
  drawSkyBox();


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
    event.layerX <= canvas.width &&
    event.layerX >= 0 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    var mouseX = event.clientX;
    var diffX = mouseX - prevMouseX;
    zAngle = zAngle + diffX / 100;
    prevMouseX = mouseX;

    var mouseY = canvas.height - event.clientY;
    var diffY = mouseY - prevMouseY;
    yAngle = yAngle - diffY / 100;
    prevMouseY = mouseY;

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

// This is the entry point from the html
function webGLStart() {
  canvas = document.getElementById("simpleLoadObjMesh");
  document.addEventListener("mousedown", onMouseDown, false);

  initGL(canvas);
  gl.enable(gl.DEPTH_TEST);

  // Load foreground image
  foregroundImageInput = document.getElementById('foregroundImageInput');
  foregroundImageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
  
    reader.onload = (e) => {
      fgPic = gl.createTexture();
      fgPic.image = new Image();
      fgPic.image.src = e.target.result;
      fgPic.image.onload = function () {
        handleTextureLoaded(fgPic);
      };
    };
  
    reader.readAsDataURL(file);
  });

  // Load background image
  backgroundImageInput = document.getElementById('backgroundImageInput');
  backgroundImageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
  
    reader.onload = (e) => {
      bgPic = gl.createTexture();
      bgPic.image = new Image();
      bgPic.image.src = e.target.result;
      bgPic.image.onload = function () {
        handleTextureLoaded(bgPic);
      };
    };
  
    reader.readAsDataURL(file);
  });

  const radioInputs = document.getElementsByName("imageType");
  for (const radio of radioInputs) {
    radio.addEventListener("change", selectImageMode);
  }

  const radioInputs0 = document.getElementsByName("modeType");
  for (const radio of radioInputs0) {
    radio.addEventListener("change", selectcolorMode);
  }

  const radioInputs1 = document.getElementsByName("processType");
  for (const radio of radioInputs1) {
    radio.addEventListener("change", selectProcessMode);
  }

  document.getElementById("cSlider").oninput=contrastChange;
  document.getElementById("bSlider").oninput=brightnessChange;


  const resetButton = document.getElementById("resetButton");
    resetButton.addEventListener('click', resetCanvas);
    resetButton.onclick = function(){
      document.getElementById('cSlider').value = 0;
      document.getElementById('bSlider').value = 0;
    };

  // Get a reference to the "Screenshot" button element
  const screenshotButton = document.getElementById("screenshotButton");
  screenshotButton.addEventListener('click', () => {
    canvas.toBlob((blob) => {
      saveBlob(blob, `screencapture-${canvas.width}x${canvas.height}.png`);
    });
  });
   
  const saveBlob = (function() {
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style.display = 'none';
    return function saveData(blob, fileName) {
       const url = window.URL.createObjectURL(blob);
       a.href = url;
       a.download = fileName;
       a.click();
    };
  }());

  // initCubeMap();
 
  // fgPic = initTextures(fgPic_file);
  // bgPic = initTextures(bgPic_file);

  initObject();
  initCubeBuffer();
  initSphereBuffer();
  initSquareBuffer();
  alphaFBO = initFBO();

  drawScene();
}
