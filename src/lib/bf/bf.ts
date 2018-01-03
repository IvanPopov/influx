/**
 * Сдвиг единицы на @a x позиций влево.
 */
export var flag = (x: number) => (1 << (x));
/**
 * Проверка того что у @a value бит под номером @a bit равен единице.
 */
export var testBit = (value: number, bit: number) => ((value & flag(bit)) != 0);
/**
 * Проверка того что у @a value равны единице все биты,
 * которые равны единице у @a set.
 */
export var testAll = (value: number, set: number) => (((value) & (set)) == (set));
/**
 * Проверка того что у @a value равны единице хотя бы какие то из битов,
 * которые равны единице у @a set.
 */
export var testAny = (value: number, set: number) => (((value) & (set)) != 0);
/**
 * Выставляет бит под номером @a bit у числа @a value равным единице
 */
export var setBit = (value: number, bit: number, setting: boolean = true) => (setting ? ((value) |= flag((bit))) : clearBit(value, bit));
/**
 *
 */
export var clearBit = (value: number, bit: number) => ((value) &= ~flag((bit)));
/**
 * Выставляет бит под номером @a bit у числа @a value равным нулю
 */
export var setAll = (value: number, set: number, setting: boolean = true) => (setting ? ((value) |= (set)) : ((value) &= ~(set)));
/**
 * Выставляет все биты у числа @a value равными единице,
 * которые равны единице у числа @a set
 */
export var clearAll = (value: number, set: number) => ((value) &= ~(set));
/**
 * Выставляет все биты у числа @a value равными нулю,
 * которые равны единице у числа @a set
 */
export var equal = (value: number, src: number) => { value = src; };
/**
 * Прирасваивает числу @a value число @a src
 */
export var isEqual = (value: number, src: number) => value == src;
/**
 * Если число @a value равно числу @a src возвращается true
 */
export var isNotEqaul = (value: number, src: number) => value != src;
/**
 * Прирасваивает числу @a value число @a src
 */
export var set = (value: number, src: number) => { value = src; };
/**
 * Обнуляет число @a value
 */
export var clear = (value: number) => { value = 0; };
/**
 * Выставляет все биты у числа @a value равными единице,
 * которые равны единице у числа @a src
 */
export var setFlags = (value: number, src: number) => (value |= src);
/**
 * Выставляет все биты у числа @a value равными нулю,
 * которые равны единице у числа @a src
 */
export var clearFlags = (value: number, src: number) => value &= ~src;
/**
 * Проверяет равно ли число @a value нулю. Если равно возвращает true.
 * Если не равно возвращает false.
 */
export var isEmpty = (value: number) => (value == 0);
/**
 * Возвращает общее количество бит числа @a value.
 * На самом деле возвращает всегда 32.
 */
export var totalBits = (value: number) => 32;


/**
 * Возвращает общее количество ненулевых бит числа @a value.
 */
export var totalSet = (value: number): number => {
	var count: number = 0;
	var total: number = totalBits(value);

	for (var i: number = total; i; --i) {
		count += (value & 1);
		value >>= 1;
	}

	return (count);
}
