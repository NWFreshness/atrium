declare module "vcf" {
  class Property {
    valueOf(): unknown;
  }
  class VCard {
    get(propName: string): Property | Property[] | undefined;
    static parse(text: string): VCard[];
  }
  export default VCard;
}
