# sn-client-core

[![Gitter chat](https://img.shields.io/gitter/room/SenseNet/SN7ClientAPI.svg?style=flat)](https://gitter.im/SenseNet/SN7ClientAPI)
[![Build Status](https://travis-ci.org/SenseNet/sn-client-core.svg?branch=master)](https://travis-ci.org/SenseNet/sn-client-core)
[![codecov](https://codecov.io/gh/SenseNet/sn-client-core/branch/master/graph/badge.svg)](https://codecov.io/gh/SenseNet/sn-client-core)
[![Greenkeeper badge](https://badges.greenkeeper.io/SenseNet/sn-client-core.svg)](https://greenkeeper.io/)
[![NPM version](https://img.shields.io/npm/v/@sensenet/client-core.svg?style=flat)](https://www.npmjs.com/package/@sensenet/client-core)
[![NPM downloads](https://img.shields.io/npm/dt/@sensenet/client-core.svg?style=flat)](https://www.npmjs.com/package/@sensenet/client-core)
[![License](https://img.shields.io/github/license/SenseNet/sn-client-js.svg?style=flat)](https://github.com/sn-client-core/LICENSE.txt)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=flat)](http://commitizen.github.io/cz-cli/)

This component lets you work with the [sensenet](https://github.com/SenseNet) Content Repository (create or manage content, execute queries, etc.) by providing a JavaScript client API for the main content operations.
The library connects to a sensenet's [REST API](https://community.sensenet.com/docs/odata-rest-api/), but hides the underlying HTTP requests. You can work with simple load or create Content operations in JavaScript, instead of having to construct ajax requests yourself.

> Tested with the following **sensenet services** version: 
> 
> [![Sense/Net Services](https://img.shields.io/badge/sensenet-7.1.3%20tested-green.svg)](https://github.com/SenseNet/sensenet/releases/tag/v7.1.3)

## Installation

```shell
npm install @sensenet/client-core
```

## Usage

### Creating a Repository instance

Your main entry point in this library is the Repository object. You can create an Instance by the following way:

```ts
import { Repository } from '@sensenet/client-core';

const repository = new Repository({
    repositoryUrl: "https://my-sensenet-site.com",
    oDataToken: "OData.svc",
    sessionLifetime: "expiration",
    defaultSelect: ["DisplayName", "Icon"],
    requiredSelect: ["Id", "Type", "Path", "Name"],
    defaultMetadata: "no",
    defaultInlineCount: "allpages",
    defaultExpand: [],
    defaultTop: 1000,
});
```
 - __repositoryURL__: The component will communicate with your repositoy using the following url. This will fall back to your _window.location.href_, if not specified. To enable your external app to send request against your sensenet portal change your ```Portal.settings```. For further information about cross-origin resource sharing in sensenet check [this](community.sensenet.com/docs/cors/)
article.
 - __oDataToken__: Check your Sense/Net portal's web.config and if the ```ODataServiceToken``` is set, you can configure it here for the client side.
 - __sessionLifetime__ - You can change how user sessions should be persisted on the client, you can use _'session'_, whitch means the user will be logged out when closing a browser, or _'expiration'_, in that case the token expiration property will be used. This behaviour is implemented for JWT Authentication. (See [JWT Token docs](http://community.sensenet.com/docs/web-token-authentication/) for further details)
 - __defaultSelect__ - These fields will be selected by default on each OData request. Can be a field, an array of fields or 'all'
 - __requiredSelect__ - These fields will always be included in the OData *$select* statement. Also can be a field, an array of fields or 'all'
 - __defaultMetadata__ - Default *metadata* value for OData requests. Can be 'full', 'minimal' or 'no'
 - __defaultInlineCount__ - Default *inlinecount* OData parameter. Can be 'allpages' or 'none'
 - __defaultExpand__ - Default fields to *$expand*, empty by default. Can be a field or an array of fields.
 - __defaultTop__ - Default value to the odata *$top* parameter

### Loading content

You can load a specified content by its full path or Id by the following way:

```ts

import { User } from "@sensenet/default-content-types";

const user = await repository.load<User>({
    idOrPath: "/Root/IMS/BuiltIn/Portal/Visitor", // you can also load by content Id
    oDataOptions: {                               // You can provide additional OData parameters
        expand: ["CreatedBy"],
        select: "all",
    },
});
console.log(user);    // {d: { /*(...retrieved user data)*/ }}
```

You can also load a content reference by providing a full reference path (e.g.: ``/Root/IMS/BuiltIn/Portal/('Visitor')/CreatedBy``)

If you want to load a content collection (children, query results or one-to-many references ) you can do it with the following method:

```ts
const portalUsers = await repository.loadCollection<User>({
    path: "/Root/IMS/BuiltIn/Portal",
    oDataOptions: {
        query: "TypeIs:User",
        orderby: ["LoginName"],
    },
});

console.log("Count: ", portalUsers.d.__count);
console.log("Users: ", portalUsers.d.results);
```

### Creating and modifying content

You can execute specific POST, PATCH and PUT OData requests on the Repository instance:

```ts
const createdUser = await repository.post<User>({
    parentPath: "Root/Parent",
    contentType: "User",
    content: {
        Name: "NewContent",
        /** ...additional content data */
    },
});

// you can also use PUT in the similar way
const lockedUser = await repository.patch<User>({
    idOrPath: "Root/Path/To/User",
    content: {
        Locked: true,
    },
});
```

### Delete, move, copy batch actions

You can execute these batch actions right on the Repository instance:

```ts
// you can use move in the similar way
const copyResult = await repository.copy({
    idOrPath: [45, "Root/Path/To/Content"],
    targetPath: "Root/Target/Path",
});

const deleteResult = await repository.delete({
    idOrPath: "Root/Path/To/Content/To/Delete",
    permanent: true,
});
```

### Executing custom actions

You can define and execute your custom OData actions by the following way:
```ts
interface ICustomActionBodyType { Name: string; Value: string; }
interface ICustomActionReturnType { Result: any; }
const actionResult = await repository.executeAction<ICustomActionBodyType, ICustomActionReturnType>({
    idOrPath: "Path/to/content",
    method: "POST",
    name: "MyOdataCustomAction",
    body: {
        Name: "foo",
        Value: "Bar",
    },
});
console.log(actionResult.Result);
```

### Shortcuts for built-in Odata actions

You can use built-in actions in the ``repository.security`` and in the ``repository.versioning`` namespaces on repository instances.
