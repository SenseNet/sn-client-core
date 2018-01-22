import { IdentityKind, Inheritance, PermissionLevel, PermissionValues } from "@sensenet/default-content-types";
import { expect } from "chai";
import { Repository } from "../src/Repository/Repository";
import { Security } from "../src/Repository/Security";

// tslint:disable:completed-docs
export const securityTests = describe("Security", () => {

    let security: Security;

    beforeEach(() => {
        security = new Security(new Repository({}, async (...args: any[]) => ({ok: true, json: async () => ({})} as any)));
    });

    it("Should execute setPermissionInheritance", () => {
        expect(security.setPermissionInheritance(1, Inheritance.break)).to.be.instanceof(Promise);
    });

    it("Should execute setPermissions", () => {

        expect(security.setPermissions(1, {
            AddNew: PermissionValues.allow,
            identity: "root/users/user1",
        })).to.be.instanceof(Promise);
    });

    it("Should execute getPermissions", () => {
        expect(security.getPermissions(1, "root/users/user1")).to.be.instanceof(Promise);
    });

    it("Should execute hasPermission", () => {
        expect(security.hasPermission(1, ["See"], "root/users/user1")).to.be.instanceof(Promise);
    });

    it("Should throw if hasPermission fails", async () => {
        // tslint:disable-next-line:no-string-literal
        security["repository"]["fetchMethod"] = async () => ({ok: false} as any);
        try {
            await security.hasPermission(1, ["See"], "root/users/user1");
            throw Error("Should throw!");
        } catch (error) {
            /** ignore */
        }
    });

    it("Should execute getRelatedIdentities", () => {
        expect(security.getRelatedIdentities(1, PermissionLevel.Allowed, IdentityKind.All)).to.be.instanceof(Promise);

    });

    it("Should execute getRelatedPermissions", () => {
        expect(security.getRelatedPermissions(1, PermissionLevel.Allowed, true, "root/user/member")).to.be.instanceof(Promise);
    });

    it("Should execute getRelatedItems", () => {
        expect(security.getRelatedItems(1, PermissionLevel.Allowed, true, "root/users/member1", [])).to.be.instanceof(Promise);
    });

    it("Should execute getRelatedIdentitiesByPermissions", () => {
        expect(security.getRelatedIdentitiesByPermissions(1, PermissionLevel.Allowed, IdentityKind.All, [])).to.be.instanceof(Promise);
    });

    it("Should execute getRelatedItemsOneLevel", () => {
        expect(security.getRelatedItemsOneLevel(1, PermissionLevel.Allowed, "root/users/member", [])).to.be.instanceof(Promise);
    });

    it("Should execute getAllowedUsers", () => {
        expect(security.getAllowedUsers(1, [])).to.be.instanceof(Promise);
    });

    it("Should execute getParentGroups", () => {
        expect(security.getParentGroups(1, true)).to.be.instanceof(Promise);
    });

    it("Should execute addMembers", () => {
        expect(security.addMembers(1, [])).to.be.instanceof(Promise);
    });

    it("Should execute removeMembers", () => {
        expect(security.removeMembers(1, [])).to.be.instanceof(Promise);
    });

});
