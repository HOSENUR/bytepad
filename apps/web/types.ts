export type PlaygroundTemplateType = {
    id: number;
    name: string;
    description: string;
    framework: FrameworkType;
};
export type PlaygroundType = {
    id: number;
    tag: string;
    framework: FrameworkType;
    owner: string;
    createdAt: string;
    PlaygroundMember: {
        role: string;
        userId: string;
    }
}
export enum FrameworkType {
    REACT = "REACT",
    VUE = "VUE",
    NEXT_APP = "NEXT-APP"
}