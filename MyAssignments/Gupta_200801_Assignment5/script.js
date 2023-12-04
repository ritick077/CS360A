////////////////////////////////////////////////////////////////////////
// A simple WebGL program to draw simple 2D shapes with animation.
//

var gl;
var color;
var matrixStack = [];

// mMatrix is called the model matrix, transforms objects
// from local object space to world space.
var mMatrix = mat4.create();
var uMMatrixLocation;
var aPositionLocation;
var uColorLoc;
var flagLocation;
var bounceLocation;
var flagVal = [0.0];
var bounceVal = [1];

var light_pos = [0., 0.2, -0.2];

// for storing indices and points of circle and square

var sqVertexPositionBuffer;
var sqVertexIndexBuffer;

const vertexShaderCode = `#version 300 es
in vec2 aPosition;
uniform mat4 uMMatrix;

void main() {
  gl_Position = uMMatrix*vec4(aPosition,0.0,1.0);
}`;

const fragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;

uniform vec4 color;
uniform vec3 light_pos;
uniform float flag;
uniform int BOUNCES;
struct Material 
{
    float diffuse;
    float specular;
    float shininess;
    float ambience;
    float reflection;
};
    
const Material material11 = Material(0.7, 0.8, 200., 0.8, 0.9);
const Material material1 = Material(0.8, 1.2, 20., 0.8, 0.9);
const Material material12 = Material(0.7, 1.5, 150., 0.6, 0.9);
const Material material2 = Material(0.4, 0.28, 124.3, 0.2, 1.);
const Material material3 = Material(0.514, 0.19, 76.8, 0.7, 1.);


struct Camera
{
    vec3 position;
    float focalDistance;
};
    
#define SPHERES_COUNT 4
struct Sphere 
{
    vec3 position;
    vec3 color;
    float radius;
    Material material;
} spheres[SPHERES_COUNT];   

struct PointLight
{
    vec3 position;
    vec3 color; // Not used for now
    float intensity;
} lights[1];
    
const Sphere sphere1 = Sphere(
	vec3(0.07, -0.092, -0.14), 
    vec3(0.1, 0.1, 0.3), 
    0.04, 
	material1);

const Sphere sphere2 = Sphere(
	vec3(-0.07, -0.092, -0.14), 
    vec3(0.1, 0.3, 0.1),  
    0.04, 
    material1);

const Sphere sphere3 = Sphere(
  vec3(0., -0.005, 0.03), 
    vec3(0.3, 0.1, 0.1),  
    0.125, 
    material1);

const Sphere sphere4 = Sphere(
  vec3(0.0, -0.73, 0.1), 
    vec3(0.25, 0.25, 0.25),  
    0.6, 
    material1);

const Camera camera = Camera(
    vec3(0., -0.125, -0.27), 
    0.6);

PointLight light1 = PointLight(
  vec3(0., 0.2, -0.2), // position
    vec3(1., 1., 1.),     // color
    15.);                 // intensity


#define SPHERE 0

void setupScene()
{
	spheres[0] = sphere1;
  spheres[1] = sphere2;
  spheres[2] = sphere3;
  spheres[3] = sphere4;
    
  lights[0] = light1;

}    

Material getMaterial(int type, int index)
{
    if (type == SPHERE)
        return spheres[index].material;
}

bool solveQuadratic(float a, float b, float c, out float t0, out float t1)
{
    float disc = b * b - 4. * a * c;
    
    if (disc > 0.)
    {
      t0 = (-b + sqrt(disc)) / (2. * a);
      t1 = (-b - sqrt(disc)) / (2. * a);
      return true;
    } 
    
    if (disc == 0.)
    {
        t0 = t1 = -b / (2. * a);
        return true;
    }
    
    return false;
}

vec3 getFragmentColor(in vec3 viewDir, in vec3 surfacePointPosition, in vec3 objectColor, in PointLight pointLight, in vec3 surfaceNormal, in Material material)
{
    vec3 lightVector = surfacePointPosition - pointLight.position;
    vec3 lightDir = normalize(lightVector);   
    
   	float lightIntensity = (pow(0.1, 2.) / pow(length(lightVector), 2.)) * pointLight.intensity;
    
    float coeff = -dot(lightDir, surfaceNormal);     
    
    vec3 ambient = material.ambience * objectColor;
        
    vec3 diffuse = material.diffuse * max(coeff, 0.) * objectColor * lightIntensity;
       
    vec3 halfwayDir = normalize(lightDir + viewDir);  
    vec3 specular = pow(max(-dot(surfaceNormal, halfwayDir), 0.0), material.shininess) * material.specular * objectColor * lightIntensity;
    
    vec3 color = ambient + diffuse + specular;
    
    return color;
}

bool intersectSphere(
    vec3 origin, 
    vec3 direction, 
    Sphere sphere, 
    out float dist, 
    out vec3 surfaceNormal, 
    out vec3 Phit)
{

    float t0;
    float t1;

    vec3 L = origin - sphere.position;
    
    float a = dot(direction, direction);
    float b = 2. * dot(direction, L);
    float c = dot(L, L) - pow(sphere.radius, 2.);
    
    if (solveQuadratic(a, b, c, t0, t1))
    {        
        if (t0 > t1) 
        {
        	float temp = t0;
            t0 = t1;
            t1 = temp;
        } 
 
        if (t0 < 0.)
        { 
            t0 = t1; 
            if (t0 < 0.) return false; 
        }  
             
        dist = t0;
       
        Phit = origin + dist * direction;
        surfaceNormal = normalize(Phit - sphere.position);               
        
        return true;
    }  
     
    return false;
}

void calculateShadow(vec3 pHit, inout vec3 finalColor, float ambient, int type, int index)
{

    vec3 shadowSurfaceNormal;
    vec3 shadowRay = lights[0].position - pHit;
    vec3 shadowRayDirection = normalize(shadowRay);
    float distanceToLight = sqrt(dot(shadowRay, shadowRay));
    vec3 shadowPhit;
    
    float dist; 
    
    for(int i = 0; i < 4; ++i)
	{
        if (type == SPHERE && index == i)
        {
            continue;  
        }
    
        if (intersectSphere(pHit, shadowRayDirection, spheres[i], dist, shadowSurfaceNormal, shadowPhit))
        {
            if (dist > 0. && distanceToLight > dist)
            {
            	finalColor *= 0.45 * ambient; // Educated guess
            }
        }
    }
     
}

void calculateReflection(vec3 rayOrigin, vec3 rayDirection, vec3 surfaceNormal, inout vec3 finalColor, int type, int index)
{

    // BOUNCES = 1;

    vec3 reflectedPhit;
    
    vec3 reflectedRay = reflect(rayDirection, surfaceNormal);
    vec3 reflectedRayDirection = normalize(reflectedRay);

    vec3 pHit = rayOrigin;

    for (int bounce = 0; bounce < 1; bounce++)
    {   
      float dist = 1./0.; 
      float distanceToObject = dist ;
      
      vec3 passColor = vec3(0.);
      
      for(int i = 0; i < 4; ++i)
      {
        if (type == SPHERE && index == i)
        {
            continue;  
        }
    
        if (intersectSphere(pHit, reflectedRayDirection, spheres[i], distanceToObject, surfaceNormal, reflectedPhit))
        {
            if (dist>0. && distanceToObject < dist)
            {
              dist = distanceToObject;
              passColor = getFragmentColor(reflectedRayDirection, reflectedPhit, spheres[i].color, lights[0], surfaceNormal, spheres[i].material);
              
              
                finalColor += getMaterial(type, index).specular * passColor*0.5;
              

            }
        }
      }
      
      pHit = reflectedPhit;
      reflectedRayDirection = reflect(reflectedRayDirection, surfaceNormal);


    }
}

vec3 rayTrace1(in vec3 rayDirection, in vec3 rayOrigin)
{
    vec3 finalColor = vec3(0.);
    
    vec3 pHit = rayOrigin; 
    vec3 passPHit;
    
    float dist = 1. / 0.; // Infinity :) 
    float objectHitDistance = dist;

    vec3 surfaceNormal;
    
    int type = -1;
    int index = -1;   
    
    vec3 passColor = vec3(0.);

    for (int i = 0; i < SPHERES_COUNT; ++i)
    {          
        if (intersectSphere(rayOrigin, rayDirection, spheres[i], objectHitDistance, surfaceNormal, pHit))
        {                
            if (objectHitDistance < dist)
            {
                dist = objectHitDistance;
                passColor = getFragmentColor(rayDirection, pHit, spheres[i].color, lights[0], surfaceNormal, spheres[i].material);
                
                if(flag == 3.0){
                  calculateShadow(pHit, passColor, spheres[i].material.ambience, SPHERE, i); //shadow
                }
                type = SPHERE;
                index = i;
            }
        }
    }

    if(flag == 3.0)
    finalColor += getMaterial(type, index).specular * passColor; //reflection

    
    return finalColor;
}
vec3 rayTrace2(in vec3 rayDirection, in vec3 rayOrigin)
{
    vec3 finalColor = vec3(0.);
    
    vec3 pHit = rayOrigin; 
    vec3 passPHit;
    
    float dist = 1. / 0.; // Infinity :) 
    float objectHitDistance = dist;

    vec3 surfaceNormal;
    
    int type = -1;
    int index = -1;   
    
    vec3 passColor = vec3(0.);


    for (int i = 0; i < SPHERES_COUNT; ++i)
    {          
        if (intersectSphere(rayOrigin, rayDirection, spheres[i], objectHitDistance, surfaceNormal, pHit))
        {                
            if (objectHitDistance < dist)
            {
                dist = objectHitDistance;
                passColor = getFragmentColor(rayDirection, pHit, spheres[i].color, lights[0], surfaceNormal, spheres[i].material);
                
                type = SPHERE;
                index = i;
            }
        }
    }

    if(flag == 3.0)
    finalColor += getMaterial(type, index).specular * passColor; //reflection

    
    return finalColor;
}

vec3 rayTrace(in vec3 rayDirection, in vec3 rayOrigin)
{
  vec3 finalColor = vec3(0.0);
  
  // int BOUNCES = 5;

  float flag1 = flag;
  int prevType = -1;
  int prevIndex = -1;

  int renderBool = 1;

  vec3 pHit = rayOrigin;
  vec3 passPHit;

  for(int bounce = 0; bounce <= BOUNCES; bounce++){
    float dist = 1. / 0.;
    float objectHitDistance = dist;

    vec3 surfaceNormal;
    
    int type = -1;
    int index = -1;   
    
    vec3 passColor = vec3(0.);

    for (int i = 0; i < 4; ++i)
    {        
      if (prevType == SPHERE && prevIndex == i)
      {
        continue;
      }  
      if (intersectSphere(rayOrigin, rayDirection, spheres[i], objectHitDistance, surfaceNormal, pHit))
      {                
        if (objectHitDistance < dist)
        {
          dist = objectHitDistance;
          passColor = getFragmentColor(rayDirection, pHit, spheres[i].color, lights[0], surfaceNormal, spheres[i].material);

          if(flag1 == 0.0){
            renderBool =-1;
          }
          if(flag1 == 1.0){
            calculateShadow(pHit, passColor, spheres[i].material.ambience, SPHERE, i); //shadow
            renderBool =-1;
          }
                    
          if(flag1 == 3.0){
            flag1 == 2.0;
          }

          type = SPHERE;
          index = i;
          passPHit = pHit;
        }
      }
    }
    

    if(type < 0)  break;

    if (bounce==0)finalColor = passColor;
      else
      finalColor  += passColor;

    finalColor/=2.0;
    rayOrigin = passPHit;
    rayDirection = normalize(reflect(rayDirection, surfaceNormal));
    
    prevType = type;
    prevIndex = index;

    if(renderBool < 0)  break;
  }
  return finalColor*2.0;
}
void main()
{
    setupScene();
    
    lights[0].position = light_pos;
    
    vec2 uv = gl_FragCoord.xy/vec2(550, 550) - 0.5;

    vec3 clipPlanePosition = vec3(uv.x, uv.y, camera.position.z + camera.focalDistance);
    vec3 rayDirection = normalize(clipPlanePosition - camera.position);
     
    vec3 finalColor;

    if(flag == 3.0)
     finalColor = rayTrace(rayDirection, camera.position)+rayTrace1(rayDirection, camera.position)-rayTrace2(rayDirection, camera.position);
    
    else 
     finalColor = rayTrace(rayDirection, camera.position);
    
    // Output
    fragColor = vec4(finalColor, 1.0);
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

function drawSquare(color, mMatrix, flag, bounce) {
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniform3f(uLightPosition,light_pos[0], light_pos[1], light_pos[2]);

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
  gl.uniform1f(flagLocation, flag[0]);
  gl.uniform1i(bounceLocation, bounce[0]);


  // now draw the square
  gl.drawElements(
    gl.TRIANGLES,
    sqVertexIndexBuffer.numItems,
    gl.UNSIGNED_SHORT,
    0
  );
}


// function to draw scenes
function drawScene() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  mat4.identity(mMatrix);
    gl.clearColor(0.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    uLightPosition = gl.getUniformLocation(shaderProgram,"light_pos");
    flagLocation = gl.getUniformLocation(shaderProgram, "flag");
    bounceLocation = gl.getUniformLocation(shaderProgram, "BOUNCES");

    // drawing and placing the sky
    mMatrix = mat4.scale(mMatrix, [2,2,1]);
    drawSquare([1.0, 0.9, 0.9, 1.0], mMatrix, flagVal, bounceVal);
   
}

function lightChange(event) {
  light_pos[0]=event.target.value/25;
  drawScene();
}
function bounceChange(event) {
  bounceVal=[event.target.value];
  drawScene();
}
function selectP(event) {
  flagVal=[0.0]
  drawScene();
}
function selectPS(event) {
  flagVal=[1.0]
  drawScene();
}
function selectPR(event) {
  flagVal=[2.0]
  drawScene();
}
function selectPSR(event) {
  flagVal=[3.0]
  drawScene();
}
// This is the entry point from the html
function webGLStart() {
  var canvas = document.getElementById("scenery2D");

  document.getElementById("light").addEventListener('input', lightChange, false);

  document.getElementById("bounce").addEventListener('input', bounceChange, false);

  document.getElementById("P")
          .addEventListener('click', selectP);

  document.getElementById("PS")
          .addEventListener('click', selectPS);

  document.getElementById("PR")
          .addEventListener('click', selectPR);

  document.getElementById("PSR")
          .addEventListener('click', selectPSR);

  initGL(canvas);
  gl.enable(gl.DEPTH_TEST);

  shaderProgram = initShaders();

  //get locations of attributes declared in the vertex shader
  const aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");

  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");

  //enable the attribute arrays
  gl.enableVertexAttribArray(aPositionLocation);

  uColorLoc = gl.getUniformLocation(shaderProgram, "color");

  initSquareBuffer();

  drawScene();
}
