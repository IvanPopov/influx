#include <string>
#include <algorithm>
#include <iostream>

#include "bundle_uav.h"
#include "memory_view.h"

namespace VM
{
   void BUNDLE_UAV::Minidump() const
   {
      std::cout
         << "uav "
         << name << "["
         << length << "x" << elementSize << ":"
         << "r" << reg << ":"
         << "cnt(" << ReadCounter() << ")"
         << "]" << std::endl;

      uint32_t n = std::min(64u, length * elementSize);
      char temp[512]{};
      int l = 0;
      for (uint32_t i = 0; i < n; ++i)
      {
         l += sprintf(temp + l, "%X ", (uint32_t)(data.As<uint8_t>()[i]));
      }
      std::cout << temp << "..." << std::endl;
   }
}
