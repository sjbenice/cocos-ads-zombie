import { _decorator, Component, MeshRenderer, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Number3d')
export class Number3d extends Component {
    @property(MeshRenderer)
    mesh100:MeshRenderer = null;
    @property(MeshRenderer)
    mesh010:MeshRenderer = null;
    @property(MeshRenderer)
    mesh001:MeshRenderer = null;

    @property(MeshRenderer)
    mesh10:MeshRenderer = null;
    @property(MeshRenderer)
    mesh01:MeshRenderer = null;

    @property(MeshRenderer)
    mesh1:MeshRenderer = null;

    protected _value:number = 0;

    start() {
        this.setValue(this._value);
    }

    public getValue() : number {
        return this._value;
    }

    public setValue(value:number) {
        if (this._value != value) {
            this._value = value;
            const digit100 = Math.floor(value / 100);
            const digit10 = Math.floor((value % 100) / 10);
            const digit01 = value % 10;

            this.node.children.forEach(element => {
                element.active = false;
            });

            if (digit100 > 0) {
                this.mesh100.node.active = true;
                this.mesh010.node.active = true;
                this.mesh001.node.active = true;
                this.setMatherial(this.mesh100, digit100);
                this.setMatherial(this.mesh010, digit10);
                this.setMatherial(this.mesh001, digit01);
            } else {
                if (digit10 > 0) {
                    this.mesh10.node.active = true;
                    this.mesh01.node.active = true;
                    this.setMatherial(this.mesh10, digit10);
                    this.setMatherial(this.mesh01, digit01);
                } else {
                    this.mesh1.node.active = true;
                    this.setMatherial(this.mesh1, digit01);
                }
            }            
        }
    }

    protected setMatherial(mesh:MeshRenderer, value:number) {
        if (mesh && value >= 0 && value < mesh.materials.length)
            mesh.material = mesh.materials[value];
    }
}


