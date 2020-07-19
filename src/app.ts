import { View } from './view'
import { Controller } from './controller'
import { TimeManager } from './timeManager'
import { BallSolver } from './ballSolver'

import { MathUtils, Vector2 } from 'three'

let radius : number;

// The radius of the ball will be chosen based on this factor. This represents
// roughly how much of the screen we want to be occupied by balls.
const ballRadiusFactor = 0.4;
const ballCount = 500;

let ballSolver : BallSolver; 
function ResetBallSolver(element : HTMLElement) : void {
    const aspect = element.offsetWidth / element.offsetHeight;

    // World-space width and height
    const width = 2;
    const height = 2.0/aspect;

    radius = 
        Math.sqrt(ballRadiusFactor * width * height / (ballCount * Math.PI));

    ballSolver = new BallSolver(
        /* minRange */ new Vector2(-1.0, -1.0/aspect),
        /* maxRange */ new Vector2(1.0, 1.0/aspect),
        radius);

    for (let i = 0; i < ballCount; i++) {
        ballSolver.AddBall(
            /* position */ new Vector2(
                MathUtils.randFloat(-aspect,aspect), 
                MathUtils.randFloat(-aspect,aspect)),
            /* velocity */ new Vector2(
                MathUtils.randFloat(-0.3,0.3), 
                MathUtils.randFloat(-0.3,0.3)),
            /* mass */ 1,
            /* radius */ radius,
            /* restitution */ 0.8)
    }
}

// Defer setting up the view. We do this because we expect a dom element with 
// the "app" ID, but it won't exist since js in the header gets loaded before
// the dom elements.
let view;
function ResetView(element : HTMLElement) : void {
    // When updating the view, we need to be sure to replace the old dom element 
    // instead of just adding a new one.
    const oldDomElement = view == null ? null : view.GetDomElement();
    view = new View(element, ballSolver);

    if (oldDomElement == null) {
        element.appendChild(view.GetDomElement());
    }
    else {
        element.replaceChild(view.GetDomElement(), oldDomElement);
    }
}

// Defer setting up the controller for the same reason as the view.
let controller;
function ResetController(element : HTMLElement) : void {
    controller = new Controller(window, element, ballSolver);
}

const timestepManager = new TimeManager(
    /* timestep_ms */ 10.0,
    /* timestepLimitPerUpdate */ 10);

/**
 * The main update loop of the app.
 */
function Animate() : void {
    requestAnimationFrame(Animate);

    if (ballSolver != null) {
        timestepManager.Update(
            ballSolver.Solve.bind(ballSolver));
    }

    if (view != null) {
        view.Render();
    }
}

// When the dom content loads, instantiate the view and controller
function OnDOMContentLoaded(event) : void {
    const appElement = document.getElementById('app');

    ResetBallSolver(appElement);
    ResetView(appElement);
    ResetController(appElement);
}
document.addEventListener('DOMContentLoaded', OnDOMContentLoaded);

// When window resizes, reset everything.
function OnWindowResize() {
    const appElement = document.getElementById('app');

    ResetBallSolver(appElement);
    ResetView(appElement);
    ResetController(appElement);
}
window.addEventListener('resize', OnWindowResize);

Animate();
