import { _decorator, Component, MeshCollider, MeshRenderer, Node } from 'cc';
import { CSG } from '../util/CSG';
const { ccclass, property } = _decorator;

@ccclass('GoldFieldController')
export class GoldFieldController extends Component {
    @property
    xSize:number = 0;
    @property
    ySize:number = 0;
    @property
    zSize:number = 0;

    protected _meshRenderer:MeshRenderer = null;
    protected _meshCollider:MeshCollider = null;

    protected _csg:CSG = null;

    protected onLoad(): void {
        this._meshRenderer = this.getComponent(MeshRenderer);
        this._meshCollider = this.getComponent(MeshCollider);
    }

    public getCSG() : CSG {
        return this._csg;
    }

    public setCSG(csg:CSG) {
        if (csg) {
            // console.log(csg.polygons.length);

            this._csg = csg;
            const mesh = CSG.toMesh(csg);
            if (mesh) {
                if (this._meshRenderer)
                    this._meshRenderer.mesh = mesh;
                if (this._meshCollider)
                    this._meshCollider.mesh = mesh;
            }
        }
    }

    start() {
        // if (this.xSize > 0 && this.ySize > 0 && this.zSize > 0) {
        //     const csg = CSG.cube({radius:[this.xSize, this.ySize / 2, this.zSize]})
        //     this.setCSG(csg);
        // }
        this._csg = CSG.fromMesh(this._meshRenderer.mesh);
    }
}


