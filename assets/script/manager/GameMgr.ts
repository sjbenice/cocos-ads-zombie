import { _decorator, CameraComponent, Color, Component, director, EventMouse, EventTouch, Game, geometry, Graphics, Input, input, math, Node, NodeEventType, PhysicsSystem, Toggle, Tween, UITransform, v2, Vec2, Vec3 } from 'cc';
import { SoundMgr } from './SoundMgr';
import event_html_playable from '../event_html_playable';
import { Utils } from '../util/Utils';
import { GameState } from './GameState';
import { Tutor } from '../controller/Tutor';
import { AssistantController } from '../controller/AssistantController';
import { GoldFieldController } from '../controller/GoldFieldController';
const { ccclass, property } = _decorator;

enum AngleDirection {
    None,
    Increasing,
    Decreasing
}

@ccclass('GameMgr')
export class GameMgr extends Component {
    static VERSION = {
        FULL: 1,
        ACTION_3: 2,
    };

    @property(Node)
    playCtrl:Node = null;
    @property(Node)
    btnSound:Node = null;
    @property(Node)
    packshotCtrl:Node = null;

    @property(Graphics)
    graphics: Graphics = null;

    @property(CameraComponent)
    camera3D:CameraComponent = null;

    @property(Tutor)
    tutor:Tutor = null;

    @property(AssistantController)
    zombie:AssistantController = null;

    @property(GoldFieldController)
    mountain:GoldFieldController = null;

    private static _instance: GameMgr = null;
    private _version:number = 0;
    private _isGameEnd:boolean = false;
    private _pressing:boolean = false;
    private _clicking:boolean = false;

    private _message:number = Tutor.MESSAGE.NONE;
    
    private _uiTransform:UITransform = null;
    private _worldPos:Vec3 = Vec3.ZERO.clone();
    private _localPos:Vec3 = Vec3.ZERO.clone();

    private static STROKE_COLOR : Color = Color.WHITE;
    private _points: number[] = [];
    private _vec3points: Vec3[] = [];
    private static UI_THRESHOLD2: number = 60 * 60;  // Distance^2 threshold for smoothing
    private static WORLD_PATH_DIRECTION_EPSILON:number = 0.2;
    private static AREA_MIN:number = 200;
    // private _currentDirection: AngleDirection = AngleDirection.None;
    private _ray:geometry.Ray = new geometry.Ray();
    private _previousRayHitPoint:Vec3 = Vec3.ZERO.clone();
    protected _pos:Vec3 = Vec3.ZERO.clone();
    protected _curArea:number = 0;
   
    protected physicsSystem = PhysicsSystem.instance;
    protected p0 = Vec2.ZERO.clone();
    protected p1 = Vec2.ZERO.clone();

    protected q0 = Vec2.ZERO.clone();
    protected q1 = Vec2.ZERO.clone();

    onLoad() {
        if (GameMgr._instance) {
            this.node.destroy();
            return;
        }
        GameMgr._instance = this;
        // director.addPersistRootNode(this.node);

        this._version = event_html_playable.version();
        if (this._version <= 0) {
            this._version = parseInt(Utils.getUrlParameter('version'), 10);
            if (!this._version)
                this._version = GameMgr.VERSION.FULL;
        }
        console.log(this._version);

        if (!this.graphics)
            this.graphics = this.getComponent(Graphics);
        if (!this.graphics)
            this.graphics.strokeColor = GameMgr.STROKE_COLOR;

        this._uiTransform = this.getComponent(UITransform);
    }
    
    protected onDestroy(): void {
        this.unscheduleAllCallbacks();

        if (GameMgr._instance == this)
            GameMgr._instance = null;

        if (!this._isGameEnd)
            event_html_playable.trackExit();

        if (!Utils.isTouchDevice()) {
            input.off(Input.EventType.MOUSE_DOWN, this._onInputMouseDown, this);
            input.off(Input.EventType.MOUSE_MOVE, this._onInputMouseMove, this);
            input.off(Input.EventType.MOUSE_UP, this._onInputMouseUp, this);
            // if (HTML5) {
            //     document.removeEventListener('pointerlockchange', this._onPointerlockchange);
            // }
        } else {
            // this.node.off(Node.EventType.TOUCH_START, this._onThisNodeTouchStart, this);
            // this.node.off(Node.EventType.TOUCH_END, this._onThisNodeTouchEnd, this);
            // this.node.off(Node.EventType.TOUCH_CANCEL, this._onThisNodeTouchCancelled, this);
            // this.node.off(Node.EventType.TOUCH_MOVE, this._onThisNodeTouchMove, this);
            input.off(Input.EventType.TOUCH_START, this._onThisNodeTouchStart, this);
            input.off(Input.EventType.TOUCH_MOVE, this._onThisNodeTouchMove, this);
            input.off(Input.EventType.TOUCH_END, this._onThisNodeTouchEnd, this);
            input.off(Input.EventType.TOUCH_CANCEL, this._onThisNodeTouchCancelled, this);
        }
    }

    start() {
        event_html_playable.game_start();

        if (this.btnSound && (event_html_playable.hideSoundButton() || event_html_playable.hideAllButton()))
            this.btnSound.active = false;

        if (this.packshotCtrl)
            this.packshotCtrl.active = false;

        if (!Utils.isTouchDevice()) {
            input.on(Input.EventType.MOUSE_DOWN, this._onInputMouseDown, this);
            input.on(Input.EventType.MOUSE_MOVE, this._onInputMouseMove, this);
            input.on(Input.EventType.MOUSE_UP, this._onInputMouseUp, this);
            // if (HTML5) {
            //     document.addEventListener('pointerlockchange', this._onPointerlockchange);
            // }
        } else {
            // this.node.on(Node.EventType.TOUCH_START, this._onThisNodeTouchStart, this);
            // this.node.on(Node.EventType.TOUCH_END, this._onThisNodeTouchEnd, this);
            // this.node.on(Node.EventType.TOUCH_CANCEL, this._onThisNodeTouchCancelled, this);
            // this.node.on(Node.EventType.TOUCH_MOVE, this._onThisNodeTouchMove, this);
            input.on(Input.EventType.TOUCH_START, this._onThisNodeTouchStart, this);
            input.on(Input.EventType.TOUCH_MOVE, this._onThisNodeTouchMove, this);
            input.on(Input.EventType.TOUCH_END, this._onThisNodeTouchEnd, this);
            input.on(Input.EventType.TOUCH_CANCEL, this._onThisNodeTouchCancelled, this);
        }

        if (this.tutor) {
            this.tutor.setArea(this.getCutArea(), this.camera3D);
            this.tutor.showTutor(true);
        }
    }
    
    private _onInputMouseDown(event: EventMouse) {
        switch (event.getButton()) {
            default:
                break;
            case EventMouse.BUTTON_LEFT:
                this._onClickOrTouch(event.getUILocationX(), event.getUILocationY(), event.getLocationX(), event.getLocationY());
                break;
        }
    }

    private _onInputMouseMove(event: EventMouse) {
        this._onClickOrTouchMove(event.getUILocationX(), event.getUILocationY(), event.getLocationX(), event.getLocationY());
    }

    private _onInputMouseUp (event: EventMouse) {
        switch (event.getButton()) {
            default:
                break;
            case EventMouse.BUTTON_LEFT:
                this._onClickOrTouchEnd();
                break;
        }
    }

    private _onThisNodeTouchStart (touchEvent: EventTouch) {
        const touch = touchEvent.touch;
        if (!touch) {
            return;
        }

        this._onClickOrTouch(touch.getUILocationX(), touch.getUILocationY(), touch.getLocationX(), touch.getLocationY());
    }

    private _onThisNodeTouchEnd () {
        this._onClickOrTouchEnd();
    }
    
    private _onThisNodeTouchCancelled () {
        this._onThisNodeTouchEnd();
    }

    private _onThisNodeTouchMove (touchEvent: EventTouch) {
        const touch = touchEvent.touch;
        if (!touch) {
            return;
        }
        this._onClickOrTouchMove(touch.getUILocationX(), touch.getUILocationY(), touch.getLocationX(), touch.getLocationY());
    }

    private _onClickOrTouchEnd() {
        if (this._clicking) {
            this._clicking = false;
            event_html_playable.interact_end();
            if (this.tutor && this.zombie && !this.zombie.isWorking())
                this.tutor.showTutor(true);
        }

        if (this._pressing) {
            this._pressing = false;

            this.drawRedPath();
        }

        if (this._message != Tutor.MESSAGE.NONE && this.tutor)
            this.tutor.showMessage(this._message, 1);
    }

    private _onClickOrTouch(x: number, y: number, screenX:number, screenY:number) {
        if (this._isGameEnd)
            return;

        if (GameState.getState() == GameState.State.THIRD) {
            GameState.setState(GameState.State.END);
            return;
        }

        this._clicking = true;
        
        SoundMgr.onFirstClick();
        if (this.tutor)
            this.tutor.showTutor(false);

        this._doClickOrTouch(x, y, screenX, screenY, false);
    }

    private _onClickOrTouchMove(x: number, y: number, screenX:number, screenY:number) {
        if (this._pressing) {
            this._doClickOrTouch(x, y, screenX, screenY, true);
        }
    }

    private _doClickOrTouch(x: number, y: number, screenX:number, screenY:number, moving:boolean) {
        // console.log(x, y);
        this._worldPos.set(x, y, 0);
        this._uiTransform.convertToNodeSpaceAR(this._worldPos, this._localPos);
        const nodeX = this._localPos.x, nodeY = this._localPos.y;
        
        if (!this.tutor!.checkRange(nodeY)) {
            this._pressing = false;
            this._message = Tutor.MESSAGE.RANGE_OVER;
            if (moving)
                this.drawRedPath();
        } else {
            if (moving) {
                this._pressing = this.addPoint(nodeX, nodeY, screenX, screenY, false);
            } else {
                if (this.zombie && !this.zombie.isWorking()) {
                    if (this.tutor && this.tutor.shouldDivide()) {
                        this.tutor.clearDivide();
                        this._pressing = false;
                        if (this.zombie) {
                            this._curArea /= 2;
                            
                            // let minZ = Infinity, maxZ = -Infinity;
                            
                            const center = this._vec3points[0].clone();
                            center.add(this._vec3points[this._vec3points.length - 1]);
                            center.multiplyScalar(0.5);

                            // this._vec3points.forEach(pos => {
                            //     if (pos.z < minZ)
                            //         minZ = pos.z;
                            //     if (pos.z > maxZ)
                            //         maxZ = pos.z;
                            // });

                            const newPoints = [];
                            const isLeft:boolean = center.z < this._vec3points[0].z;
                            for (let index = 0; index < this._vec3points.length; index++) {
                                const element = this._vec3points[index];
                                if (newPoints.length >= 2 && (element.z < center.z) == isLeft)
                                    break;
                                newPoints.push(element);
                            }
                            newPoints.push(center);
                            newPoints.reverse();

                            if (newPoints.length >= 3) {
                                this.zombie.cutGold(this.mountain, newPoints, 
                                    this.tutor, this._curArea, this._curArea, true);
                            }
                        }
                    } else {
                        // this._currentDirection = AngleDirection.None;
                        this._previousRayHitPoint.set(Vec3.ZERO);
        
                        this._points = [];
                        this._vec3points = [];
        
                        if (!this._isGameEnd) {
                            event_html_playable.interact_start();
                
                            this._pressing = this.addPoint(nodeX, nodeY, screenX, screenY, true);
                            if (this._pressing)
                                this._message = Tutor.MESSAGE.NONE;//TRACE_COMPLETELY;
                        }
                    }
                }
            }
        }
    }

    protected isPathSelfIntersecting(path:number[], x:number, y:number) {
        function getVec2(path:number[], index:number, out:Vec2) {
            out.x = path[index * 2];
            out.y = path[index * 2 + 1];
        }
        const pointCount = path.length / 2;
        if (pointCount > 3) {
            getVec2(path, pointCount - 2, this.p1);
            getVec2(path, pointCount - 1, this.q0);
            this.q1.set(x, y);
            if (this.q1.equals(this.p1))
                return true;

            for (let i = 0; i < pointCount - 2; i ++) {
                getVec2(path, i, this.p0);
                getVec2(path, i + 1, this.p1);
                if (Utils.doIntersect(this.p0, this.p1, this.q0, this.q1)) {
                    return true;
                }
            }
        }
        return false;
    }

    private addPoint(x:number, y:number, screenX:number, screenY:number, noHit:boolean) : boolean {
        if (this._points.length >= 2) {
            const xDelta = this._points[this._points.length - 2] - x;
            const yDelta = this._points[this._points.length - 1] - y;
            if (xDelta * xDelta + yDelta * yDelta < GameMgr.UI_THRESHOLD2) {
                return true;  // Ignore the point if it's too close to the last one
            }
        }

        if (this.isPathSelfIntersecting(this._points, x, y)) {
            this._message = Tutor.MESSAGE.DONT_CROSS;
            this.drawRedPath();
        } else {
            if (this.checkDirection(screenX, screenY, noHit)) {
                this._points.push(x, y);
                // console.log(x, y);
                this.drawPath(false);
        
                return true;
            }
        }

        return false;
    }

    private getWorldRayHitPoint(screenX:number, screenY:number, out:Vec3) : number {
        if (this.camera3D) {
            this._worldPos.set(screenX, screenY, this.camera3D.near);
            let ray = this.camera3D.screenPointToRay(screenX, screenY, this._ray);
            if (this.physicsSystem.raycast(ray)) {
                let results = this.physicsSystem.raycastResults;
                if (results) {
                    results.sort((a, b) => a.distance - b.distance);
                    const closestHit = results[0];
                    if (closestHit.hitPoint.y > 0) {
                        if (closestHit.collider.node.name == 'Gold') {
                            out.set(closestHit.hitPoint);
                            return 1;
                        } else
                            return -1;
                    }
                }
            }
        }

        return 0;
    }

    private printPath(path:number[]) {
        for (let index = 0; index < path.length; index+=2) {
            console.log(path[index], path[index + 1]);
        }
    }

    private drawPath(close:boolean, red:boolean = false) {
        if (!this.graphics) return;

        this.node.getPosition(this._pos);
        this._pos.x += 1;
        this.node.setPosition(this._pos);
        this._pos.x -= 1;
        this.node.setPosition(this._pos);

        this.graphics.clear();
        if (red)
            this.graphics.strokeColor = Color.RED;

        if (this._points.length < 4) {
            return;
        }
        const smoothedPoints = this._points;//this.getSmoothPoints(this._points);

        this.graphics.moveTo(smoothedPoints[0], smoothedPoints[1]);
        for (let i = 2; i < smoothedPoints.length; i += 2) {
            this.graphics.lineTo(smoothedPoints[i], smoothedPoints[i + 1]);
        }

        if (close)
            this.graphics.close();

        this.graphics.stroke();

        if (red)
            this.graphics.strokeColor = GameMgr.STROKE_COLOR;
    }

    private checkDirection(x:number, y:number, noHit:boolean) : boolean {
        const prevHit = !this._previousRayHitPoint.equals(Vec3.ZERO);
        const hit = this.getWorldRayHitPoint(x, y, this._worldPos);
        if (hit > 0) {
            if (noHit) {// mouse down event
                if (this._worldPos.x > -3) {
                    const startPos = this._worldPos.clone();
                    startPos.x = Tutor.START_X;
                    this._vec3points.push(startPos);
                } else
                    return false;
            }

            const delta = this._worldPos.z - this._previousRayHitPoint.z;
            if (!prevHit || Math.abs(delta) > GameMgr.WORLD_PATH_DIRECTION_EPSILON) {
                // if (prevHit) {
                //     const newDirection = delta > 0 ? AngleDirection.Increasing : AngleDirection.Decreasing;
                //     if (this._currentDirection !== AngleDirection.None && newDirection !== this._currentDirection) {
                //         this._message = Tutor.MESSAGE.DONT_ZIGZAG;
                //         this.drawRedPath();
                //         return false;  // Invalidate path if zig-zagging is detected
                //     }
                //     this._currentDirection = newDirection;
                // }
                this._previousRayHitPoint.set(this._worldPos);
            }

            this._vec3points.push(this._worldPos.clone());

            return true;
        } else if (hit < 0) {
            this.drawRedPath();
            this._message = Tutor.MESSAGE.CANT_CUT;
            return false;
        } else if (prevHit) {
            if (this.tutor && this.tutor.checkPath(this._points) 
                && this.checkPath(this._vec3points)) {
                this._vec3points[0].x = Tutor.START_X;
                this._vec3points[this._vec3points.length - 1].x = Tutor.START_X;

                if (this.zombie) {
                    // this.printPath(this._points);

                    this.zombie.cutGold(this.mountain, this._vec3points, 
                        this.tutor, this._curArea, this.getCutArea(), false);

                    if (this.graphics)
                        this.graphics.clear();
                }

                this._message = Tutor.MESSAGE.NONE;

            } else
                this.drawRedPath();

            return false;
        }

        return true;
    }

    protected getCutArea() {
        return GameMgr.AREA_MIN * (GameState.getState() == GameState.State.FIRST ? 1 : 5);
    }

    private checkPath(points:Vec3[]) : boolean {
        let isValid:boolean = false;

        if (points.length >= 3) {
            const areaSize = Utils.calculatePolygonAreaXZ(points);
            // console.log(areaSize);
            const curTargetArea = this.getCutArea();
            if (areaSize < curTargetArea / (GameState.getState() == GameState.State.FIRST ? 20 : 6)) {
                this._message = Tutor.MESSAGE.TOO_SMALL;
            } else /*if (areaSize > curTargetArea * 2) {
                this._message = Tutor.MESSAGE.TOO_HEAVY;
            } else */{
                isValid = true;
                this._curArea = areaSize;
            }
        }

        return isValid;
    }

    private drawRedPath() {
        if (this._points.length >= 4) {
            this.drawPath(false, true);
            this.scheduleOnce(()=>{
                this.graphics.clear();
            }, 0.3);
        }
    }

    private getSmoothPoints(points: number[]): number[] {
        const smoothedPoints: number[] = [];

        for (let i = 0; i < points.length - 3; i += 2) {
            const prev = Math.max(0, i - 2);
            const last = Math.min(points.length - 2, i + 4);

            const smoothSegment = this.getCatmullRomPoints(
                points[prev], points[prev + 1], 
                points[i], points[i + 1],
                points[i + 2], points[i + 3], 
                points[last], points[last + 1]);

            smoothedPoints.push(...smoothSegment);
        }

        return smoothedPoints;
    }

    private getCatmullRomPoints(p0x:number, p0y:number, p1x:number, p1y:number, p2x:number, p2y:number, p3x:number, p3y:number, 
            numSegments: number = 20): number[] {
        const points: number[] = [];

        for (let i = 0; i <= numSegments; i++) {
            const t = i / numSegments;
            const tt = t * t;
            const ttt = tt * t;

            const q0 = -ttt + 2 * tt - t;
            const q1 = 3 * ttt - 5 * tt + 2;
            const q2 = -3 * ttt + 4 * tt + t;
            const q3 = ttt - tt;

            const x = 0.5 * (p0x * q0 + p1x * q1 + p2x * q2 + p3x * q3);
            const y = 0.5 * (p0y * q0 + p1y * q1 + p2y * q2 + p3y * q3);

            points.push(x, y);
        }

        return points;
    }

    update(deltaTime: number) {
        if (GameState.isChanged()) {
            const gameState = GameState.getState();
            if (this._version == GameMgr.VERSION.ACTION_3 || gameState == GameState.State.END)
                this.gotoFirstScene();
        }
    }
    
    public gotoFirstScene() {
        if (this._isGameEnd) return;

        this._isGameEnd = true;

        event_html_playable.game_end();
        
        if (this.tutor)
            this.tutor.showTutor(false);

        this.scheduleOnce(()=>{
            const scheduler = director.getScheduler();
            scheduler.unscheduleAll();
            Tween.stopAll();

            // GameState.setState(GameState.State.SPLASH);

            // this.node.destroy();
            // SoundMgr.destroyMgr();

            if (this.playCtrl)
                this.playCtrl.active = false;
            if (this.packshotCtrl)
                this.packshotCtrl.active = true;

            // director.loadScene("first");
            event_html_playable.redirect();
        }, GameState.getState() == GameState.State.END ? 0 : 1);
    }

    onToggleSound(target: Toggle) {
        SoundMgr.onSound(target.isChecked);

        event_html_playable.trackSound(target.isChecked);
    }

    onBtnPlay() {
        event_html_playable.track_gtag('winInstall');
        event_html_playable.download();
    }
}


