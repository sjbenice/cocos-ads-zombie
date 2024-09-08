import { _decorator, AudioSource, Collider, Component, instantiate, Node, ParticleSystem, PointToPointConstraint, Prefab, Quat, RigidBody, SkeletalAnimation, Vec3 } from 'cc';
import { AvatarController } from './AvatarController';
import { GoldController } from './GoldController';
const { ccclass, property } = _decorator;

@ccclass('MachineController')
export class MachineController extends Component {
    @property(Node)
    driverPos:Node = null;
    
    @property(Prefab)
    chainPrefab:Prefab = null;

    @property(Node)
    ropeGroup:Node = null;

    @property
    turnRight:boolean = true;

    speed:number = 10;
    followX:number = 2;
    followZ:number = 4;
    angleSpeed:number = 180;

    protected _audio:AudioSource = null;
    protected _anim:SkeletalAnimation = null;
    protected _working:boolean = false;
    protected _velocity:Vec3 = Vec3.ZERO.clone();
    protected _tempPos:Vec3 = Vec3.ZERO.clone();
    protected _followQuat:Quat = Quat.IDENTITY.clone();
    protected _tempQuat:Quat = Quat.IDENTITY.clone();
    protected _curPos:Vec3 = Vec3.ZERO.clone();
    protected _followPrevPos:Vec3 = Vec3.ZERO.clone();
    protected _followNextPos:Vec3 = Vec3.ZERO.clone();

    protected _isFirst:boolean = true;

    protected _followNode:Node = null;
    protected _followDistance:number = 0;
    protected _targetPos:Vec3 = Vec3.ZERO.clone();
    protected _moving:boolean = false;

    protected onLoad(): void {
        this._audio = this.getComponent(AudioSource);
        this._anim = this.getComponentInChildren(SkeletalAnimation);
    }

    start() {

    }

    public isWorking() : boolean {
        return this._working;
    }

    public startWorking(work:boolean) {
        if (this._working == work)
            return;

        if (work && this.driverPos && this.driverPos.children.length) {
            this.driverPos.children.forEach(element=>{
                element.active = true;
            });
        }

        if (this._audio) {
            if (work)
                this._audio.play();
            else
                this._audio.stop();
        }

        if (this._anim) {
            if (work)
                this._anim.play();
            else
                this._anim.stop();
        }

        this.node.getComponentsInChildren(ParticleSystem).forEach(element => {
            if (work)
                element.play();
            else
                element.stop();
        });

        this._working = work;
    }

    protected getCurrentTargetPos(out:Vec3) : boolean {
        let ret:boolean = true;

        if (this._followNode) {
            this._followNode.getWorldPosition(this._tempPos);
            this.node.getWorldPosition(out);

            if (this._followDistance > 0) {
                this._tempPos.subtract(out);
                const distance = this._tempPos.length();
                if (distance > this._followDistance * 1.2) {
                    this._tempPos.normalize();
                    this._tempPos.multiplyScalar(distance - this._followDistance);
                    out.add(this._tempPos);
                }else
                    ret = false;
            }
        } else
            out.set(this._targetPos);

        return ret;
    }

    moveParalell(node:Node) {
        this._moving = false;

        this.node.getWorldPosition(this._tempPos);
        this.node.getWorldRotation(this._tempQuat);

        this.node.setParent(node ? node : this.node.parent.parent);

        this.node.setWorldPosition(this._tempPos);
        this.node.setWorldRotation(this._tempQuat);

        if (node)
            this.disableRope();
        else
            this.hideRope();
    }

    follow(node:Node, distance:number) {
        this.startWorking(node != null);

        if (node) {
            node.getWorldPosition(this._followPrevPos);
            this._followDistance = distance;// > 0 ? distance : this._tempPos.subtract(this._curPos).length();
        }

        // this.node.getWorldPosition(this._tempPos);
        // this.node.getWorldRotation(this._tempQuat);

        // this.node.setParent(node ? node : this.node.parent.parent);

        // this.node.setWorldPosition(this._tempPos);
        // this.node.setWorldRotation(this._isFirst ? Quat.IDENTITY : this._tempQuat);

        // this.scheduleOnce(()=>{
            this._followNode = node;
        // }, this._isFirst ? 1 : 0);

        this._isFirst = false;
        this._moving = true;
    }

    moveTo(targetPos:Vec3) {
        this.startWorking(true);

        this._targetPos.set(targetPos);
        this._targetPos.y = 0;

        this._followNode = null;
        this._moving = true;
    }

    protected disableRope() {
        this.ropeGroup.children.forEach(element => {
            element.getComponents(PointToPointConstraint).forEach(p2p => {
                p2p.destroy();//.enabled = false;
            });
            const rigid = element.getComponent(RigidBody);
            if (rigid)
                rigid.destroy();
            const collider = element.getComponent(Collider);
            if (collider)
                collider.destroy();//.enabled = false;
        });
    }

    thowRope(chainLength:number) {
        if (this.ropeGroup && this.chainPrefab) {
            this.ropeGroup.active = true;

            const pos = Vec3.ZERO.clone();

            let prevRigidChain:RigidBody = null;

            const chainCount = Math.floor(chainLength / GoldController.CHAIN_LENGTH);
            for (let index = 0; index < chainCount; index++) {
                const element = index < this.ropeGroup.children.length ? this.ropeGroup.children[index] : instantiate(this.chainPrefab);
                if (element) {
                    element.setParent(this.ropeGroup);

                    const p2p:PointToPointConstraint = element.getComponent(PointToPointConstraint);
                    p2p.connectedBody = prevRigidChain;

                    prevRigidChain = element.getComponent(RigidBody);
                    prevRigidChain.enabled = true;

                    if (index % 2) {
                        element.setRotationFromEuler(0, 90, 0);
                    }

                    if (index == chainCount - 1) {
                        element.addComponent(PointToPointConstraint);
                        pos.y = -GoldController.CHAIN_Y * 0.2;
                    }

                    pos.z -= GoldController.CHAIN_LENGTH;
                    element.setPosition(pos);
                }
            }

            for (let index = chainCount; index < this.ropeGroup.children.length; index++) {
                const element = this.ropeGroup.children[index];
                element.removeFromParent();
                element.destroy();
            }
        }
    }

    hideRope() {
        if (this.ropeGroup) {
            this.ropeGroup.removeAllChildren();
            this.ropeGroup.active = false;
        }
    }

    protected update(dt: number): void {
        if (this._moving && this.getCurrentTargetPos(this._curPos)) {
            this.node.getWorldPosition(this._tempPos);

            Vec3.subtract(this._velocity, this._curPos, this._tempPos);
            const distance = this._velocity.lengthSqr();
            // console.log(distance);
            this._velocity.normalize();
            this._velocity.multiplyScalar(dt * this.speed);
            if (this._velocity.length() > distance) {
                this._tempPos.set(this._curPos);
            } else {
                this._tempPos.add(this._velocity);
            }

            if (distance < 0.1) {
                this.node.setWorldPosition(this._curPos);

                if (this.turnRight && AvatarController.faceViewCommon(this._followNode ? this._followNode.forward : Vec3.RIGHT, dt, this.node, this.angleSpeed) < 0.01){
                    // this.startWorking(false);
                }
            } else {
                if (AvatarController.faceViewCommon(this._velocity, dt, this.node, this.angleSpeed) < 0.01 || this._followNode)
                    this.node.setWorldPosition(this._tempPos);
            }
        }
        /*
        if (this._working && this._followNode) {
            this._followNode.getWorldPosition(this._followPos);
            // this._tempPos.x += this.followX;
            this._followPos.z -= this.followZ;

            this.node.getWorldPosition(this._tempPos);
            this._tempPos.lerp(this._followPos, dt * this.speed);
            this.node.setWorldPosition(this._tempPos);
            this._followPos.subtract(this._tempPos);
            const distance = this._followPos.lengthSqr();
            // if (distance < 1) {
            //     this._followNode.getWorldRotation(this._tempQuat);
            //     this.node.getWorldRotation(this._followQuat);
            //     this._followQuat.lerp(this._tempQuat, dt);
            //     this.node.setWorldRotation(this._followQuat);
            // } else
                AvatarController.faceViewCommon(this._followPos, dt, this.node, 120);
        }*/
    }
}


