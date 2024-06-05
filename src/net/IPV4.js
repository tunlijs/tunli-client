export const ipV4 = (address) => {

  if (address instanceof IPV4) {
    return address
  }
  return new IPV4(address)
}

export class IPV4 {

  #ipv4Address

  /**
   * @type {IPV4}
   */
  #subnet

  /**
   * @type {boolean}
   */
  #isValid

  constructor(ipv4Address) {

    this._ipv4Address = this.#ipv4Address = this.#prepare(ipv4Address)
    this.#isValid = this.#ipv4Address !== null
  }

  /**
   * @returns {boolean}
   */
  get isValid() {
    return this.#isValid
  }

  /**
   * @return {number|null}
   */
  get cidrSuffix() {
    return this.#ipv4Address?.cidrSuffix ?? null
  }

  get subnetAddress() {
    this.#subnet ??= this.#calculateSubnet()
    return this.#subnet
  }

  #calculateSubnet() {

    const mask = ipV4(~((1 << (32 - this.cidrSuffix)) - 1) >>> 0)
    const octets = []

    for (let i = 0; i < 4; i++) {
      const maskPart = mask.#ipv4Address.octetsAsIntegers[i]
      const ipPart = this.#ipv4Address.octetsAsIntegers[i]
      octets.push(maskPart & ipPart)
    }

    return ipV4(octets.join('.'))
  }

  #prepare(ipv4Address) {

    const typeOfAddress = typeof ipv4Address
    let octets = []
    let octetsAsIntegers = []
    let octetsAsBinaryString = []
    let ipv4AddressAsInt;
    let ipv4AddressAsString;
    let cidrSuffix = 32;

    if (typeOfAddress === 'number') {
      ipv4AddressAsInt = ipv4Address
      const binaryRepresentation = ipv4Address.toString(2)
      const chunkSize = 8
      for (let i = binaryRepresentation.length; i > 0; i -= chunkSize) {
        const octetAsBin = binaryRepresentation.substring(i - chunkSize, i).padStart(8, '0')
        const octetAsInt = parseInt(octetAsBin, 2)

        octetsAsBinaryString.unshift(octetAsBin);
        octetsAsIntegers.unshift(octetAsInt);
        octets.unshift(octetAsInt.toString());
      }

      ipv4AddressAsString = octets.join('.')
    } else if (typeOfAddress === 'string') {

      const parts = ipv4Address.split('/')
      if (parts.length > 2) {
        return null
      } else if (parts.length === 2) {
        cidrSuffix = parseInt(parts[1])
        if (isNaN(cidrSuffix)) {
          return null
        }
      }

      octetsAsIntegers = parts[0].split('.').map(Number)
      octets = octetsAsIntegers.map(x => x.toString())
      ipv4AddressAsString = octets.join('.')
      octetsAsBinaryString = octetsAsIntegers.map(x => x.toString(2).padStart(8, '0'))
    } else {
      return null
    }

    if (octetsAsIntegers.filter(x => x <= 255).length !== 4) {
      return null
    }

    return {
      asString: ipv4AddressAsString,
      octets,
      octetsAsIntegers,
      octetsAsBinaryString,
      asInt: ipv4AddressAsInt,
      cidrSuffix
    }
  }

  isInSubnet(subnet) {
    subnet = ipV4(subnet)
    const mask = ~((1 << (32 - subnet.cidrSuffix)) - 1) >>> 0;
    return (this.toInteger() & mask) === (subnet.toInteger() & mask)
  }

  toString() {
    return this.#ipv4Address?.asString ?? null
  }

  toInteger() {
    if (!this.#ipv4Address) {
      return null
    }

    this.#ipv4Address.asInt ??= parseInt(this.#ipv4Address.octetsAsBinaryString.join(''), 2)
    return this.#ipv4Address.asInt
  }
}

