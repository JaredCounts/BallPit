import { View } from './view'
import { Controller } from './controller'
import { TimeManager } from './timeManager'
import { BallSolver } from './ballSolver'

import { MathUtils, Vector2 } from 'three'

let ballSolver = new BallSolver(
    /* minRange */ new Vector2(-1, -1),
    /* maxRange */ new Vector2(1, 1));

for (let i = 0; i < 500; i++) {
    ballSolver.AddBall(
        new Vector2(MathUtils.randFloat(-1,1), MathUtils.randFloat(-1,1)),
        new Vector2(MathUtils.randFloat(-0.3,0.3), MathUtils.randFloat(-0.3,0.3)),
        /* mass */ 1,
        /* radius */ 0.02,
        /* restitution */ 0.8);

}
// ballSolver.AddBall(
//     new Vector2(0, 0),
//     new Vector2(0, 0),
//     /* mass */ 1,
//     /* radius */ 0.1);
// ballSolver.AddBall(
//     new Vector2(0.5, 0),
//     new Vector2(0, 0),
//     /* mass */ 1,
//     /* radius */ 0.1);


// Defer setting up the view. We do this because we expect a dom element with 
// the "app" ID, but it won't exist since js in the header gets loaded before
// the dom elements.
let view;
function ResetView() : void {
    const appElement = document.getElementById('app');

    // When updating the view, we need to be sure to replace the old dom element 
    // instead of just adding a new one.
    const oldDomElement = view == null ? null : view.GetDomElement();
    view = new View(appElement, ballSolver);

    if (oldDomElement == null) {
        appElement.appendChild(view.GetDomElement());
    }
    else {
        appElement.replaceChild(view.GetDomElement(), oldDomElement);
    }
}

// Defer setting up the controller for the same reason as the view.
let controller;
function ResetController() : void {
    let appElement = document.getElementById('app');
    controller = new Controller(window, appElement);
}

const timestepManager = new TimeManager(
    /* timestep_ms */ 10.0,
    /* timestepLimitPerUpdate */ 10);

/**
 * The main update loop of the app.
 */
function Animate() : void {
    requestAnimationFrame(Animate);

    timestepManager.Update(
        ballSolver.Solve.bind(ballSolver));

    if (view != null) {
        view.Render();
    }
}

// When the dom content loads, instantiate the view and controller
function OnDOMContentLoaded(event) : void {
    ResetView();
    ResetController();
}
document.addEventListener('DOMContentLoaded', OnDOMContentLoaded);

// When window resizes, reset everything.
function OnWindowResize() {
    ResetView();
    ResetController();
}
window.addEventListener('resize', OnWindowResize);

Animate();
