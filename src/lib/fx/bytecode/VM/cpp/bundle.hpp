inline std::string ReadString(uint8_t* data, memory_view constants)
{
    uint32_t* i32a = constants.As<uint32_t>();
    uint32_t byteOffset = *((uint32_t*)data);
    uint32_t len = i32a[byteOffset >> 2];
    return std::string(((char*)i32a) + byteOffset + 4, len);
}


template <typename TUPLE_T, int i>
void ValidateTupleArgument(const BUNDLE_EXTERN& ex) {
    using ELEMENT_T = std::tuple_element_t<i, TUPLE_T>;
    assert(sizeof(ELEMENT_T) == ex.params[i].size);
};

template <typename TUPLE_T, std::size_t... Is>
void ValidateTupleArgumentsManual(const BUNDLE_EXTERN& ex, std::index_sequence<Is...>) {
    (ValidateTupleArgument<TUPLE_T, Is>(ex), ...);
}

template <typename TUPLE_T, std::size_t TUPLE_SIZE = std::tuple_size_v<TUPLE_T>>
void ValidateTupleArguments(const BUNDLE_EXTERN& ex) {
    assert((std::tuple_size_v<TUPLE_T>) == ex.params.size());
    ValidateTupleArgumentsManual<TUPLE_T>(ex, std::make_index_sequence<TUPLE_SIZE>{});
}

template <typename TUPLE_T, int i>
void FillTupleArgument(TUPLE_T& tp, uint8_t*& data, memory_view constants) {
    using ELEMENT_T = std::tuple_element_t<i, TUPLE_T>;
    if constexpr (std::is_same<ELEMENT_T, std::string>::value) 
    {
        std::get<i>(tp) = std::move(ReadString(data, constants));
        data += sizeof(uint32_t); // pointer to string
    } 
    else 
    {
        std::get<i>(tp) = *(ELEMENT_T*)data;
        data += sizeof(ELEMENT_T);
    }
};

template <typename TUPLE_T, std::size_t... Is>
void FillTupleArgumentsManual(TUPLE_T& tp, uint8_t* data, memory_view constants, std::index_sequence<Is...>) {
    (FillTupleArgument<TUPLE_T, Is>(tp, data, constants), ...);
}

template <typename TUPLE_T, std::size_t TUPLE_SIZE = std::tuple_size_v<TUPLE_T>>
void FillTupleArguments(TUPLE_T& tp, uint8_t* data, memory_view constants) {
    FillTupleArgumentsManual(tp, data, constants, std::make_index_sequence<TUPLE_SIZE>{});
}

template <typename R, typename... T>
std::tuple<T...> FnArgs(R (*)(T...))
{
    return std::tuple<T...>();
}

template<typename R, typename... A>
R FnRet(R(*)(A...));

template<typename C, typename R, typename... A>
R FnRet(R(C::*)(A...));

template<typename FN_T>
void BUNDLE::SetExtern(uint32_t id, FN_T Fn)
{
    using TUPLE_T = decltype(FnArgs(Fn)); // tuple of arguments
    using RETURN_T = decltype(FnRet(Fn));

    auto& ex = m_externs[id];
    assert(sizeof(RETURN_T) == ex.ret.size);
    ValidateTupleArguments<TUPLE_T>(ex);

    m_ncalls[id] = [=](const BUNDLE_EXTERN& ex, memory_view* iinput, uint8_t* args, uint8_t* ret) -> void {
        TUPLE_T tupleArguments;
        FillTupleArguments<TUPLE_T>(tupleArguments, args, iinput[CBUFFER0_REGISTER]);
        if constexpr (std::is_same<RETURN_T, void>::value) {
            std::apply(Fn, tupleArguments);
        }
        else {
            RETURN_T val = std::apply(Fn, tupleArguments);
            memcpy(ret, &val, sizeof(RETURN_T));
        }
    };
}


void BUNDLE::SetExtern(uint32_t id, NCALL_T Fn)
{
    m_ncalls[id] = Fn;
}

